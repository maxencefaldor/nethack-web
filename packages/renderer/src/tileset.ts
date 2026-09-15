import type { GlyphInfo } from "@nethack-web/protocol";

/** What a renderer draws in one cell. */
export type Drawable =
  | {
      readonly kind: "text";
      readonly text: string;
      readonly color: string;
      /** CSS font shorthand to draw the text with. */
      readonly font: string;
      readonly emphasis: Emphasis;
    }
  | {
      readonly kind: "sprite";
      readonly image: CanvasImageSource;
      readonly sourceX: number;
      readonly sourceY: number;
      readonly sourceWidth: number;
      readonly sourceHeight: number;
      readonly emphasis: Emphasis;
    };

/** Presentation hints derived from glyph flags, independent of any tileset. */
export interface Emphasis {
  readonly hero: boolean;
  readonly pet: boolean;
  readonly pile: boolean;
  readonly detected: boolean;
}

export interface CellSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Resolves engine glyphs to drawables.
 *
 * A tileset never invents content: the typographic tileset draws the exact
 * symbol and colour the engine chose, and a sprite tileset maps the glyph
 * number to art. Both answer the same question for the same key.
 */
export interface Tileset {
  readonly id: string;
  readonly cellSize: CellSize;
  /** Pixel art is upscaled without smoothing so its pixels stay square. */
  readonly pixelArt: boolean;
  resolve(glyph: GlyphInfo): Drawable;
  /**
   * What to draw under a glyph when the engine reports no background. The
   * engine leaves plain lit floor implicit, so a sprite tileset answers with
   * its floor tile for creatures and items and null for terrain; a text
   * tileset never layers and answers null.
   */
  beneath(glyph: GlyphInfo): Drawable | null;
}
