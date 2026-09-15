import { Engine, type EngineHost, type PendingRequest } from "@nethack-web/engine";
import type {
  EngineCatalog,
  EngineEvent,
  EngineReplies,
  EngineRequestType,
  SaveFile,
} from "@nethack-web/protocol";
import { GameStore, reduceAll, withCatalog, withExit, withRequest } from "@nethack-web/state";
import type { GameSession, PreferencesStore, SavedGame, StartRequest } from "@nethack-web/ui";
import type { SaveStore } from "./persistence/save-store.js";

const SAVE_PREFIX = "save/";

/**
 * Status highlighting for Guided play, expressed as the engine's own options
 * so the colours come from the engine like everything else on the status line.
 */
const GUIDED_STATUS_HIGHLIGHTS = [
  "statushilites:5",
  "hilite_status:hitpoints/<=30%/red&bold/<=60%/yellow",
  "hilite_status:power/<=30%/red",
  "hilite_status:hunger/weak/red&bold/hungry/yellow/satiated/yellow",
  "hilite_status:encumbrance/burdened/yellow/stressed/red/strained/red&bold",
  "hilite_status:condition/major/red&bold/minor/yellow",
  "hilite_status:armor-class/down/red/up/green",
  "hilite_status:experience-level/up/green",
];

/** The engine's save file names carry the user id first; the browser user is always 0. */
function playerNameFromSavePath(path: string): string | null {
  if (!path.startsWith(SAVE_PREFIX)) return null;
  return path.slice(SAVE_PREFIX.length).replace(/^\d+/, "") || null;
}

/**
 * Owns one engine run: applies its events to the store, holds the pending
 * request so the chrome can answer it, and persists files when the run ends.
 */
export class LocalGameSession implements GameSession, EngineHost {
  readonly store = new GameStore();
  private engine: Engine | null = null;
  private pending: PendingRequest | null = null;
  private queuedExtendedCommand: string | null = null;

  constructor(
    private readonly saves: SaveStore,
    private readonly preferences: PreferencesStore,
  ) {}

  async savedGames(): Promise<readonly SavedGame[]> {
    const files = await this.saves.list();
    const byName = new Map<string, SaveFile[]>();
    for (const file of files) {
      const name = playerNameFromSavePath(file.path);
      if (name === null) continue;
      byName.set(name, [...(byName.get(name) ?? []), file]);
    }
    return [...byName.entries()].map(([playerName, saved]) => ({ playerName, files: saved }));
  }

  async start(request: StartRequest): Promise<void> {
    if (this.engine !== null) throw new Error("A game is already running");
    const preferences = this.preferences.getSnapshot();
    const options = [
      "windowtype:shim",
      "!splash_screen",
      "time",
      "showexp",
      // The engine asks about the tutorial only while the option is unset;
      // setting it either way is obeyed silently.
      ...(preferences.offerTutorial ? [] : ["!tutorial"]),
      "perm_invent",
      ...(preferences.uiMode === "newcomer" ? GUIDED_STATUS_HIGHLIGHTS : []),
    ].join(",");
    this.engine = new Engine(this);
    this.engine.start({
      playerName: request.playerName,
      options,
      args: [],
      wizardMode: request.wizardMode,
      saves: await this.saves.list(),
    });
  }

  answer<T extends EngineRequestType>(type: T, reply: EngineReplies[T]): void {
    const pending = this.pending;
    if (pending === null || pending.type !== type) {
      throw new Error(`No pending ${type} request to answer`);
    }
    this.pending = null;
    this.store.update((snapshot) => withRequest(snapshot, null));
    (pending.reply as (value: EngineReplies[T]) => void)(reply);
  }

  runExtendedCommand(name: string): void {
    if (this.pending?.type !== "getKeyOrPosition") return;
    this.queuedExtendedCommand = name;
    this.answer("getKeyOrPosition", { key: "#".charCodeAt(0) });
  }

  onCatalog(catalog: EngineCatalog): void {
    this.store.update((snapshot) => withCatalog(snapshot, catalog));
  }

  onEvents(events: readonly EngineEvent[]): void {
    this.store.update((snapshot) => reduceAll(snapshot, events));
  }

  onRequest(pending: PendingRequest): void {
    if (pending.type === "getExtendedCommand" && this.queuedExtendedCommand !== null) {
      const name = this.queuedExtendedCommand;
      this.queuedExtendedCommand = null;
      const command = this.store
        .getSnapshot()
        .catalog?.extendedCommands.find((candidate) => candidate.name === name);
      pending.reply(command === undefined ? { cancelled: true } : { index: command.index });
      return;
    }
    if (pending.type === "playerSelection") {
      pending.reply({ useEngineMenus: true });
      return;
    }
    this.pending = pending;
    this.store.update((snapshot) => withRequest(snapshot, pending.request));
  }

  onSaves(saves: readonly SaveFile[]): void {
    void this.saves.replaceAll(saves);
  }

  onExit(code: number, report: string | null): void {
    this.store.update((snapshot) => withExit(snapshot, code, report));
    this.engine?.terminate();
    this.engine = null;
  }

  onError(message: string): void {
    console.error(`Engine error: ${message}`);
  }
}
