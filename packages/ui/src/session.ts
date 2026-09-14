import type { EngineReplies, EngineRequestType, SaveFile } from "@nethack-web/protocol";
import type { GameStore } from "@nethack-web/state";

/** A saved game the player can continue. */
export interface SavedGame {
  readonly playerName: string;
  readonly files: readonly SaveFile[];
}

export interface StartRequest {
  readonly playerName: string | null;
  readonly wizardMode: boolean;
}

/**
 * What the chrome needs from whoever runs the engine.
 *
 * The UI never talks to the engine directly: it reads the store and answers
 * the request the snapshot says is pending.
 */
export interface GameSession {
  readonly store: GameStore;
  /** Answers the pending request. The value must match `snapshot.request.type`. */
  answer<T extends EngineRequestType>(type: T, reply: EngineReplies[T]): void;
  /** Sends `#name` as the next command: a key, then the extended command index when asked. */
  runExtendedCommand(name: string): void;
  start(request: StartRequest): Promise<void>;
  savedGames(): Promise<readonly SavedGame[]>;
}
