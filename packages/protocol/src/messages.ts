import type { EngineConstants } from "./constants.js";
import type { EngineEvent } from "./events.js";
import type { EngineReply, EngineRequest } from "./requests.js";

/** An extended command (`#name`) the engine build knows about. */
export interface ExtendedCommand {
  /** Position in the engine's command table; what get_ext_cmd() must return. */
  readonly index: number;
  /** Key bound to the command, 0 when none. */
  readonly key: number;
  readonly name: string;
  readonly description: string;
  readonly flags: number;
}

/** Static facts about the running engine, sent once before any event. */
export interface EngineCatalog {
  readonly version: string;
  readonly constants: EngineConstants;
  readonly extendedCommands: readonly ExtendedCommand[];
}

/** What the host passes when it boots the engine. */
export interface EngineStartOptions {
  /** Player name, or null to let the engine ask. */
  readonly playerName: string | null;
  /** NETHACKOPTIONS string, exactly as the engine parses it. */
  readonly options: string;
  /** Command line arguments after the program name. */
  readonly args: readonly string[];
  /** Start in the engine's debugging mode (wizard mode). */
  readonly wizardMode: boolean;
  /** Save files to place in the engine's file system before it starts. */
  readonly saves: readonly SaveFile[];
}

export interface SaveFile {
  readonly path: string;
  readonly bytes: Uint8Array;
}

/** Messages the engine worker sends to the host. */
export type EngineToHostMessage =
  | { readonly kind: "loaded" }
  | { readonly kind: "catalog"; readonly catalog: EngineCatalog }
  | { readonly kind: "events"; readonly events: readonly EngineEvent[] }
  | { readonly kind: "request"; readonly id: number; readonly request: EngineRequest }
  | { readonly kind: "saves"; readonly saves: readonly SaveFile[] }
  | {
      readonly kind: "exited";
      readonly code: number;
      /** The engine's end-of-game dump log, when the build writes one. */
      readonly report: string | null;
    }
  | { readonly kind: "error"; readonly message: string };

/** Messages the host sends to the engine worker. */
export type HostToEngineMessage =
  | { readonly kind: "start"; readonly options: EngineStartOptions }
  | { readonly kind: "reply"; readonly id: number; readonly reply: EngineReply };
