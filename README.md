# nethack-web

A browser client for the official NetHack engine.

The engine is NetHack 5.0, compiled unmodified to WebAssembly from a pinned
git submodule and run in a Web Worker. Everything in this repository is a view
of the engine's windowport protocol: the map, the chrome, and an encyclopedia
derived from the engine's own data files.

## Layout

| Package | Responsibility |
| --- | --- |
| `packages/engine` | NetHack submodule, WebAssembly build, worker host, bridge to the protocol |
| `packages/protocol` | Typed model of the windowport interface and the engine/host message contract |
| `packages/state` | Immutable game snapshot and the reducer that applies engine events |
| `packages/renderer` | Map drawing behind the `MapRenderer` and `Tileset` interfaces |
| `packages/ui` | React chrome: status, messages, inventory, menus, prompts, settings |
| `packages/codex` | Encyclopedia: entity data, description sources, search, pages |
| `packages/app` | Composition root, routing, persistence ports, PWA shell |
| `tools/codex-extract` | Build-time extraction of entity tables and prose from the engine tree |
| `tools/tileset-build` | Style specification in, tileset package out |

## Prerequisites

- Node 22 or newer and pnpm 10 or newer
- Xcode command line tools (macOS) or build-essential (Linux)
- The Emscripten SDK, installed by `packages/engine/scripts/install-emsdk.sh`

## Getting started

```sh
git submodule update --init
pnpm install
pnpm --filter @nethack-web/engine build:wasm   # about five minutes the first time
pnpm dev
```

## Everyday commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Serves the app on http://localhost:5173 |
| `pnpm typecheck` | Typechecks every package |
| `pnpm lint` | Lints and checks formatting with Biome |
| `pnpm test` | Runs unit tests (Vitest), including replays of recorded engine sessions |
| `pnpm test:e2e` | Plays real games in Chromium (Playwright) |
| `pnpm --filter @nethack-web/codex-extract extract` | Regenerates `packages/codex/data` from the engine tree |
| `pnpm --filter @nethack-web/tileset-build import-official` | Packages NetHack's own tiles from the engine tree into `packages/app/public/tilesets/official` |
| `pnpm --filter @nethack-web/tileset-build tileset build styles/<style>.json <out>` | Builds a tileset package from a style specification |

## How it fits together

The engine runs in a Web Worker. Its windowport calls are decoded by
`packages/engine` into typed events and requests (`packages/protocol`), folded
into an immutable snapshot (`packages/state`), and drawn by a `MapRenderer`
with a `Tileset` (`packages/renderer`) inside the React chrome
(`packages/ui`). `packages/codex` holds the encyclopedia: entity tables and
prose extracted verbatim from the engine, glyph classification, and search.
`packages/app` composes everything and owns persistence.

## Licensing

The engine in `packages/engine/nethack` and the build in `packages/engine/dist`
are distributed under the NetHack General Public License; see
`packages/engine/nethack/dat/license`. The engine is compiled from unmodified
sources at the tag recorded in `packages/engine/dist/ENGINE_VERSION`.
