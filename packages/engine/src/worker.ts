/// <reference lib="webworker" />
import type { EngineStartOptions, HostToEngineMessage, SaveFile } from "@nethack-web/protocol";
import createNetHack, { type NetHackModule } from "../dist/nethack.js";
import { ENGINE_VERSION } from "../dist/version.js";
import { Bridge, type NetHackGlobal } from "./bridge.js";
import { DataLibrary } from "./data-library.js";
import { Memory } from "./memory.js";
import { SYSCONF } from "./sysconf.js";

/**
 * Worker entry point: boots the WebAssembly engine and wires the shim
 * windowport to the bridge. The engine's blocking input calls are suspended
 * with Asyncify, so this worker is idle while the player thinks.
 */

const CALLBACK_NAME = "__nethackWindowport";
const SAVE_DIRECTORY = "/save";

const scope = self as unknown as DedicatedWorkerGlobalScope;
let bridge: Bridge | null = null;

scope.onmessage = (event: MessageEvent<HostToEngineMessage>) => {
  const message = event.data;
  switch (message.kind) {
    case "start":
      void boot(message.options);
      break;
    case "reply":
      bridge?.deliverReply(message.id, message.reply);
      break;
  }
};

async function boot(options: EngineStartOptions): Promise<void> {
  const config = {
    locateFile: (file: string) => new URL(`../dist/${file}`, import.meta.url).href,
    arguments: [...(options.wizardMode ? ["-D"] : []), ...options.args],
    print: (text: string) => console.info(`[engine] ${text}`),
    printErr: (text: string) => console.warn(`[engine] ${text}`),
    // The C library copies the environment during runtime initialisation, so
    // it must be complete before then.
    preRun: [
      (module: NetHackModule) => {
        module.ENV["NETHACKOPTIONS"] = options.options;
        module.ENV["USER"] = options.playerName ?? "player";
        module.ENV["HOME"] = "/";
      },
    ],
    // Runs after the embedded data files exist and before main(): the right
    // moment to overlay our configuration and restore saves.
    onRuntimeInitialized(this: NetHackModule) {
      this.FS.writeFile("/sysconf", SYSCONF);
      restoreSaves(this, options.saves);
      const memory = new Memory(this);
      const library = this.FS.analyzePath("/nhdat").exists
        ? new DataLibrary(this.FS.readFile("/nhdat", { encoding: "binary" }))
        : DataLibrary.empty();
      bridge = new Bridge(
        memory,
        {
          post: (message) => scope.postMessage(message),
          // exit_nhwindows() is the engine's own end-of-game signal and fires
          // before exit(); Emscripten's onExit is not reliable under Asyncify.
          finished: () => finish(this, 0),
        },
        library,
        ENGINE_VERSION,
        () => (globalThis as unknown as { nethackGlobal: NetHackGlobal }).nethackGlobal,
      );
      (globalThis as unknown as Record<string, unknown>)[CALLBACK_NAME] = (
        name: string,
        ...args: unknown[]
      ) => bridge?.handle(name, args);
      this.ccall("shim_graphics_set_callback", null, ["string"], [CALLBACK_NAME]);
      scope.postMessage({ kind: "loaded" });
    },
    onExit: (code: number) => finish(config as unknown as NetHackModule, code),
    onAbort: (reason: unknown) => {
      scope.postMessage({ kind: "error", message: String(reason) });
    },
  };
  await createNetHack(config);
}

let finished = false;

function finish(module: NetHackModule, code: number): void {
  if (finished) return;
  finished = true;
  bridge?.flush();
  scope.postMessage({ kind: "saves", saves: collectSaves(module) });
  scope.postMessage({ kind: "exited", code });
}

/** Files in the engine's data root that outlive one run: scores, logs and bones levels. */
const PERSISTENT_ROOT_FILES = /^(record|logfile|xlogfile|livelog|bon[A-Z].*)$/;

function restoreSaves(module: NetHackModule, saves: readonly SaveFile[]): void {
  if (!module.FS.analyzePath(SAVE_DIRECTORY).exists) {
    module.FS.mkdir(SAVE_DIRECTORY);
  }
  for (const save of saves) {
    module.FS.writeFile(`/${save.path}`, save.bytes);
  }
}

function collectSaves(module: NetHackModule): SaveFile[] {
  const files: SaveFile[] = [];
  const read = (path: string) => ({
    path,
    bytes: module.FS.readFile(`/${path}`, { encoding: "binary" }),
  });
  for (const name of module.FS.readdir("/")) {
    if (PERSISTENT_ROOT_FILES.test(name)) files.push(read(name));
  }
  if (module.FS.analyzePath(SAVE_DIRECTORY).exists) {
    for (const name of module.FS.readdir(SAVE_DIRECTORY)) {
      if (name !== "." && name !== "..") files.push(read(`save/${name}`));
    }
  }
  return files.filter((file) => file.bytes.length > 0);
}
