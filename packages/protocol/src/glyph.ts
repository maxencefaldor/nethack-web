/**
 * Everything the engine tells us about one map cell or menu icon.
 *
 * `glyph` is the engine's integer identity for the thing shown, unique across
 * monsters, objects, terrain and effects. `symbol` and `color` are the
 * terminal presentation the engine itself chose, so a client that draws exactly
 * these is cell-for-cell identical to the terminal game.
 */
export interface GlyphInfo {
  /** Engine glyph number, unique per distinct thing. */
  readonly glyph: number;
  /** Character the terminal interface would print. */
  readonly symbol: string;
  /** Colour index the terminal interface would use. */
  readonly color: number;
  /** Index into the engine's active symbol set. */
  readonly symbolIndex: number;
  /** MG_* bits: hero, pet, corpse, statue, pile, detected, invisible, sex. */
  readonly flags: number;
  /** Colour to draw a frame with, when the engine wants one. 0 means none. */
  readonly frameColor: number;
  /** Tile index if the engine was built with a tile map, else -1. */
  readonly tileIndex: number;
}

/** Semantic bits from `GlyphInfo.flags`, decoded through the vocabulary. */
export interface GlyphFlags {
  readonly hero: boolean;
  readonly pet: boolean;
  readonly corpse: boolean;
  readonly invisible: boolean;
  readonly detected: boolean;
  readonly ridden: boolean;
  readonly statue: boolean;
  readonly objectPile: boolean;
  readonly female: boolean;
  readonly male: boolean;
  readonly nothing: boolean;
  readonly unexplored: boolean;
}
