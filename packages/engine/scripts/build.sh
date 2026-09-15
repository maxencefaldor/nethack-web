#!/usr/bin/env bash
# Builds the official NetHack engine to WebAssembly.
#
# The engine source is a git submodule pinned to a release tag. It is copied to
# a scratch directory first because NetHack's build system writes into its own
# tree; the submodule itself stays pristine. No C source is modified: every
# adjustment below is a make variable passed on the command line.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
package="$(cd "$here/.." && pwd)"
repo="$(cd "$package/../.." && pwd)"
source_dir="$package/nethack"
build_dir="$package/build/src"
out_dir="$package/dist"
emsdk="${EMSDK_DIR:-$repo/.toolchains/emsdk}"
jobs="${JOBS:-$(sysctl -n hw.ncpu 2>/dev/null || nproc)}"

if [[ ! -f "$emsdk/emsdk_env.sh" ]]; then
  echo "Emscripten SDK not found at $emsdk. Run scripts/install-emsdk.sh first." >&2
  exit 1
fi
# shellcheck disable=SC1091
source "$emsdk/emsdk_env.sh" >/dev/null 2>&1

case "$(uname -s)" in
  Darwin) hints=hints/macOS.500 ;;
  Linux)  hints=hints/linux.500 ;;
  *) echo "Unsupported host platform: $(uname -s)" >&2; exit 1 ;;
esac

mkdir -p "$build_dir" "$out_dir"
# INCREMENTAL=1 reuses the prepared build tree for quicker link-flag iteration.
if [[ "${INCREMENTAL:-0}" != "1" || ! -f "$build_dir/Makefile" ]]; then
  rsync -a --delete --exclude .git "$source_dir/" "$build_dir/"
  # Source changes, kept as patches so the submodule stays at the release tag.
  # Each is licensed with the engine; see patches/ and LICENSE.md.
  for patch_file in "$package"/patches/*.patch; do
    [[ -e "$patch_file" ]] || continue
    patch -p1 -d "$build_dir" --silent < "$patch_file"
  done
  (cd "$build_dir/sys/unix" && sh setup.sh "$hints" >/dev/null)
  (cd "$build_dir" && make fetch-lua >/dev/null)
fi

pushd "$build_dir" >/dev/null

# Command-line make variables, each with its reason:
#   NO_NHUUID=1   the macOS hints add an Objective-C UUID object that cannot
#                 target wasm; the hints file documents this opt-out.
#   HACKDIR=/     the macOS hints reset the data directory after the cross
#                 compile hints set it; the embedded data files live at "/".
#   EMCC_CFLAGS   upstream compiles with -Werror. Newer clang releases add
#                 warnings the engine's own build did not anticipate, so the
#                 offending classes are disabled instead of editing sources.
#                 --allow-multiple-definition resolves one function that the
#                 5.0.0 tree defines identically in both earlyarg.c and
#                 sys/libnh/libnhmain.c; the first (earlyarg.c) is linked.
#   EMCC_LFLAGS   the link flags, owned here rather than inherited. They start
#                 from upstream's list and add: a JavaScript library supplying
#                 get_nhuuid()/free_nhuuid(), which 5.0.0 defines in unixmain.c
#                 but never links into the wasm target (scripts/link-library.js);
#                 heap and stack sizes matching a native NetHack process; the
#                 runtime methods the bridge uses.
#   -DDUMPLOG     compiles in the end-of-game dump log, which config.h leaves
#                 off by default; the client shows it as the end screen.
cflags="-Wall -Werror -Wno-unknown-warning-option -Wno-unused-but-set-variable -Wno-unused-but-set-global -Wno-unused-command-line-argument -Wl,--allow-multiple-definition -DNO_SIGNAL -DDUMPLOG -O3"
lflags="-DHACKDIR=\\\"/\\\" -O3"
# EXIT_RUNTIME lets exit() tear the runtime down and call onExit; without it
# the runtime stays "alive" under Asyncify and the exit is invisible.
lflags+=" -s WASM=1 -s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT=web,worker -s EXIT_RUNTIME=1"
lflags+=" -s ASYNCIFY=1 -s ASYNCIFY_IMPORTS='[\"local_callback\"]' -s ASYNCIFY_STACK_SIZE=1048576"
lflags+=" -s ALLOW_TABLE_GROWTH=1 -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=67108864 -s STACK_SIZE=4194304"
lflags+=" -s EXPORTED_FUNCTIONS='[\"_main\",\"_shim_graphics_set_callback\",\"_repopulate_perminvent\",\"_malloc\",\"_free\"]'"
lflags+=" -s EXPORTED_RUNTIME_METHODS='[\"ccall\",\"UTF8ToString\",\"stringToUTF8\",\"getValue\",\"setValue\",\"ENV\",\"FS\",\"HEAPU8\"]'"
# EM_JS functions (local_callback, create_global, ...) resolve after wasm-ld
# runs, so undefined-symbol errors must stay warnings as upstream has them.
lflags+=" -s ERROR_ON_UNDEFINED_SYMBOLS=0"
# DEBUG=1 keeps symbols and turns on runtime checks so a fault reports itself.
if [[ "${DEBUG:-0}" == "1" ]]; then
  lflags+=" -s ASSERTIONS=2 -s STACK_OVERFLOW_CHECK=2 -s SAFE_HEAP=1"
fi
lflags+=" --js-library $here/link-library.js"
lflags+=" --embed-file \$(WASM_DATA_DIR)@/"
make CROSS_TO_WASM=1 NO_NHUUID=1 HACKDIR=/ -j1 EMCC_CFLAGS="$cflags" EMCC_LFLAGS="$lflags" \
  include/nhlua.h bogusmon data engrave epitaph oracles quest.lua rumors spec_levs check-dlb \
  > "$package/build/build.log" 2>&1 || {
    echo "Engine data build failed; see $package/build/build.log" >&2
    exit 1
  }
make CROSS_TO_WASM=1 NO_NHUUID=1 HACKDIR=/ -j"$jobs" EMCC_CFLAGS="$cflags" EMCC_LFLAGS="$lflags" \
  >> "$package/build/build.log" 2>&1 || {
    echo "Engine build failed; see $package/build/build.log" >&2
    grep -n "error:\|\*\*\*" "$package/build/build.log" | head -20 >&2
    exit 1
  }
popd >/dev/null

cp "$build_dir/targets/wasm/nethack.js" "$build_dir/targets/wasm/nethack.wasm" "$out_dir/"
cp "$here/nethack.d.ts" "$out_dir/nethack.d.ts"
cp "$source_dir/dat/license" "$out_dir/LICENSE"
version="$(cd "$source_dir" && git describe --tags --always)"
printf 'export const ENGINE_VERSION = "%s";\n' "$version" > "$out_dir/version.js"
printf 'export declare const ENGINE_VERSION: string;\n' > "$out_dir/version.d.ts"
echo "Engine built: $version -> $out_dir"
ls -la "$out_dir"
