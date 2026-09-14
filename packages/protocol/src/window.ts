/** Identifier the engine uses to address a window it asked us to create. */
export type WindowId = number;

/** The five kinds of window the windowport interface knows about, plus the permanent inventory. */
export type WindowKind = "message" | "status" | "map" | "menu" | "text" | "inventory";

/** Text attributes as bits. Mirrors ATR_* in the engine, decoded by the bridge. */
export interface TextAttributes {
  readonly style: "none" | "bold" | "dim" | "italic" | "underline" | "blink" | "inverse";
  readonly urgent: boolean;
  readonly noHistory: boolean;
}

export const PLAIN_TEXT: TextAttributes = { style: "none", urgent: false, noHistory: false };

/** A colour index into the engine's sixteen-colour palette (CLR_*). 8 means "no colour". */
export type ColorIndex = number;
