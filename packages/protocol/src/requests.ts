import type { MenuSelection, MenuSelectionMode } from "./menu.js";
import type { WindowId } from "./window.js";

/**
 * Calls from the engine that block until the player answers.
 *
 * The engine's C code is synchronous: it will not advance until the reply
 * arrives. The host turns each request into UI state and replies when the
 * player acts.
 */
export type EngineRequest =
  | { readonly type: "displayWindowBlocking"; readonly window: WindowId }
  | {
      readonly type: "displayFile";
      readonly name: string;
      /** The file's contents from the engine's data library, or null when missing. */
      readonly text: string | null;
    }
  | { readonly type: "selectMenu"; readonly window: WindowId; readonly mode: MenuSelectionMode }
  | {
      readonly type: "messageMenu";
      readonly letter: string;
      readonly mode: MenuSelectionMode;
      readonly message: string;
    }
  | { readonly type: "getKey" }
  | { readonly type: "getKeyOrPosition" }
  | {
      readonly type: "yesNo";
      readonly question: string;
      /** Allowed responses, or null when any key is accepted verbatim. */
      readonly choices: string | null;
      readonly defaultChoice: string;
    }
  | { readonly type: "getLine"; readonly question: string }
  | { readonly type: "getExtendedCommand" }
  | { readonly type: "askName" }
  | { readonly type: "playerSelection" }
  | { readonly type: "previousMessage" };

export type EngineRequestType = EngineRequest["type"];

/** The answer to each request type. */
export interface EngineReplies {
  displayWindowBlocking: { readonly dismissed: true };
  displayFile: { readonly dismissed: true };
  selectMenu: { readonly selections: readonly MenuSelection[] } | { readonly cancelled: true };
  messageMenu: { readonly letter: string };
  getKey: { readonly key: number };
  getKeyOrPosition:
    | { readonly key: number }
    | { readonly x: number; readonly y: number; readonly button: number };
  yesNo: { readonly answer: string; readonly count?: number };
  getLine: { readonly text: string } | { readonly cancelled: true };
  getExtendedCommand: { readonly index: number } | { readonly cancelled: true };
  askName: { readonly name: string };
  playerSelection: { readonly useEngineMenus: true } | PlayerChoice;
  previousMessage: { readonly done: true };
}

export type EngineReply<T extends EngineRequestType = EngineRequestType> = EngineReplies[T];

/** A character the host chose itself instead of via the engine's generic menus. */
export interface PlayerChoice {
  readonly role: number;
  readonly race: number;
  readonly gender: number;
  readonly alignment: number;
}

export type ReplyFor<R extends EngineRequest> = EngineReplies[R["type"]];
