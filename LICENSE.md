# Licensing

This repository contains two separately licensed parts.

## The engine

`packages/engine/nethack` (a git submodule) and the WebAssembly build it
produces in `packages/engine/dist` are NetHack, distributed under the NetHack
General Public License. See `packages/engine/nethack/dat/license`. The engine
is built from unmodified sources at the tag recorded in the build; the only
additions at link time are two no-op JavaScript stubs in
`packages/engine/scripts/link-library.js`, which are offered under the same
licence.

## Everything else

All other code, data derived by this project's tools, artwork and text in this
repository are copyright their authors, all rights reserved, pending a licence
decision. They form a separate program that communicates with the engine over
its windowport interface. The encyclopedia prose in `packages/codex/data`
originates in the engine's `dat/data.base` and stays under the NetHack General
Public License.
