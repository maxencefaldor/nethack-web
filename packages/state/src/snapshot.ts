import type {
  EngineCatalog,
  EngineRequest,
  GlyphInfo,
  MenuEntry,
  StatusField,
  StatusHighlight,
  TextAttributes,
  WindowId,
  WindowKind,
} from "@nethack-web/protocol";

export const MAP_COLUMNS = 80;
export const MAP_ROWS = 21;

export const PLAIN_TEXT_ATTRIBUTES: TextAttributes = {
  style: "none",
  urgent: false,
  noHistory: false,
};

/** One line of text in a window, as the engine wrote it. */
export interface TextLine {
  readonly text: string;
  readonly attributes: TextAttributes;
}

/** A menu under construction or awaiting selection. */
export interface MenuSnapshot {
  readonly entries: readonly MenuEntry[];
  /** One accelerator per entry: the engine's, or one assigned when it left it blank. */
  readonly accelerators: readonly string[];
  readonly prompt: string | null;
  readonly permanentInventory: boolean;
}

export interface WindowSnapshot {
  readonly id: WindowId;
  readonly kind: WindowKind;
  readonly lines: readonly TextLine[];
  readonly menu: MenuSnapshot | null;
  /** Whether the engine asked for this window to be shown. */
  readonly shown: boolean;
}

export interface MapSnapshot {
  /** Row-major cells, `MAP_COLUMNS * MAP_ROWS` long. */
  readonly cells: readonly (GlyphInfo | null)[];
  /** Terrain the engine reports beneath each cell's glyph, when it knows and there is any. */
  readonly backgrounds: readonly (GlyphInfo | null)[];
  readonly cursor: { readonly x: number; readonly y: number };
  /** Where the engine last asked the view to centre. */
  readonly focus: { readonly x: number; readonly y: number } | null;
}

export interface Message {
  readonly id: number;
  readonly text: string;
  readonly attributes: TextAttributes;
  /** Engine turn counter when the message arrived, if known. */
  readonly turn: number | null;
}

export interface StatusValue {
  readonly text: string;
  readonly glyph: number | null;
  readonly highlight: StatusHighlight;
  readonly change: number;
  readonly percent: number;
}

export interface StatusSnapshot {
  readonly fields: Readonly<Partial<Record<StatusField, StatusValue>>>;
  readonly enabled: Readonly<Partial<Record<StatusField, boolean>>>;
  /** BL_MASK_* bits currently set. */
  readonly conditions: number;
  readonly conditionColorMasks: readonly number[];
}

export type GamePhase = "booting" | "playing" | "exited";

export interface GameSnapshot {
  readonly phase: GamePhase;
  readonly exitCode: number | null;
  /** The engine's own end-of-game report, once the game has ended. */
  readonly exitReport: string | null;
  readonly catalog: EngineCatalog | null;
  readonly windows: Readonly<Record<WindowId, WindowSnapshot>>;
  readonly map: MapSnapshot;
  readonly messages: readonly Message[];
  readonly status: StatusSnapshot;
  /** The request the engine is blocked on, or null while it computes. */
  readonly request: EngineRequest | null;
  readonly numberPad: boolean;
}

export const EMPTY_SNAPSHOT: GameSnapshot = {
  phase: "booting",
  exitCode: null,
  exitReport: null,
  catalog: null,
  windows: {},
  map: {
    cells: Array<GlyphInfo | null>(MAP_COLUMNS * MAP_ROWS).fill(null),
    backgrounds: Array<GlyphInfo | null>(MAP_COLUMNS * MAP_ROWS).fill(null),
    cursor: { x: 0, y: 0 },
    focus: null,
  },
  messages: [],
  status: { fields: {}, enabled: {}, conditions: 0, conditionColorMasks: [] },
  request: null,
  numberPad: false,
};

export function cellIndex(x: number, y: number): number {
  return y * MAP_COLUMNS + x;
}

/** The window of a given kind, if the engine has created one. */
export function windowOfKind(snapshot: GameSnapshot, kind: WindowKind): WindowSnapshot | null {
  for (const window of Object.values(snapshot.windows)) {
    if (window.kind === kind) return window;
  }
  return null;
}
