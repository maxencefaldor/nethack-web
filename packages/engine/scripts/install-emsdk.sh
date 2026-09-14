#!/usr/bin/env bash
# Installs the pinned Emscripten SDK under .toolchains/emsdk at the repo root.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../../.." && pwd)"
emsdk="${EMSDK_DIR:-$repo/.toolchains/emsdk}"
version="$(cat "$here/../emsdk.version")"

if [[ ! -d "$emsdk" ]]; then
  git clone --quiet https://github.com/emscripten-core/emsdk.git "$emsdk"
fi
pushd "$emsdk" >/dev/null
./emsdk install "$version"
./emsdk activate "$version"
popd >/dev/null
echo "Emscripten $version installed at $emsdk"
