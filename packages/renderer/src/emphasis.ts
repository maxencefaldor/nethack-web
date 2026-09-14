import type { GlyphInfo, Vocabulary } from "@nethack-web/protocol";
import type { Emphasis } from "./tileset.js";

/** Reads the MG_* bits of a glyph through the engine's vocabulary. */
export class EmphasisReader {
  private readonly hero: number;
  private readonly pet: number;
  private readonly pile: number;
  private readonly detected: number;

  constructor(vocabulary: Vocabulary) {
    this.hero = vocabulary.number("MG", "MG_HERO");
    this.pet = vocabulary.number("MG", "MG_PET");
    this.pile = vocabulary.number("MG", "MG_OBJPILE");
    this.detected = vocabulary.number("MG", "MG_DETECT");
  }

  read(glyph: GlyphInfo): Emphasis {
    return {
      hero: (glyph.flags & this.hero) !== 0,
      pet: (glyph.flags & this.pet) !== 0,
      pile: (glyph.flags & this.pile) !== 0,
      detected: (glyph.flags & this.detected) !== 0,
    };
  }
}

export const NO_EMPHASIS: Emphasis = { hero: false, pet: false, pile: false, detected: false };
