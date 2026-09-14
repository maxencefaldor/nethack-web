#!/usr/bin/env bash
# Extracts codex data from the engine tree into packages/codex/data.
#
# Requires a prior engine build (packages/engine/scripts/build.sh): the
# extractor links against the native objects that build produces for the
# engine's own makedefs tool, and compiles drawing.c the same way.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tool="$(cd "$here/.." && pwd)"
repo="$(cd "$tool/../.." && pwd)"
engine="$repo/packages/engine"
build="$engine/build/src"
out="$repo/packages/codex/data"
work="$tool/build"

if [[ ! -f "$build/src/monst.o" || ! -f "$build/src/objects.o" ]]; then
  echo "Engine host objects not found; run packages/engine/scripts/build.sh first." >&2
  exit 1
fi

mkdir -p "$out" "$work"
cflags="-I$build/include -I$build/lib/lua-5.4.8/src -DNOTPARMDECL -DDLB -Wno-unused-parameter"
cc $cflags -c -o "$work/drawing.o" "$build/src/drawing.c"
cc $cflags -c -o "$work/extract.o" "$tool/src/extract.c"
cc -o "$work/extract" "$work/extract.o" "$work/drawing.o" \
  "$build/src/monst.o" "$build/src/objects.o" "$build/src/alloc.o" \
  "$build/util/panic.o" "$build/src/hacklib.a" -lm
"$work/extract" "$out"
node "$tool/src/prose.ts" "$engine/nethack/dat/data.base" "$out/descriptions.json"
(cd "$engine/nethack" && git describe --tags --always) > "$out/ENGINE_VERSION"
echo "Codex data extracted from $(cat "$out/ENGINE_VERSION")"
