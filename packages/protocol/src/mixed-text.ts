/**
 * Decoding of the engine's "mixed" text: strings that embed a glyph as
 * `\G` followed by four hex digits of a per-game nonce and four hex digits of
 * the glyph number. The status line's gold field uses it for the `$` symbol.
 */
export interface MixedText {
  /** The text with escapes removed. */
  readonly text: string;
  /** Glyphs that appeared in the text, in order. */
  readonly glyphs: readonly number[];
}

const GLYPH_ESCAPE = /\\G[0-9A-Fa-f]{4}([0-9A-Fa-f]{4})/g;

export function decodeMixedText(encoded: string): MixedText {
  const glyphs: number[] = [];
  const text = encoded.replace(GLYPH_ESCAPE, (_match, hex: string) => {
    glyphs.push(Number.parseInt(hex, 16));
    return "";
  });
  return { text, glyphs };
}
