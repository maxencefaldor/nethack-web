import type { GlyphInfo } from "@nethack-web/protocol";
import type { EmphasisReader } from "./emphasis.js";
import { colorFromPalette, DUSK_PALETTE, type Palette } from "./palette.js";
import type { CellSize, Drawable, Tileset } from "./tileset.js";

export interface TypographicStyle {
  readonly fontFamily: string;
  readonly fontSize: number;
  /** Line height as a multiple of the font size. */
  readonly lineHeight: number;
  readonly palette: Palette;
}

export const DEFAULT_TYPOGRAPHIC_STYLE: TypographicStyle = {
  fontFamily: '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace',
  fontSize: 18,
  lineHeight: 1.25,
  palette: DUSK_PALETTE,
};

/**
 * Draws the engine's own symbols in the engine's own colours.
 *
 * Nothing here decides what a cell contains; that is the engine's choice and
 * the map stays cell-for-cell identical to the terminal game. The tileset owns
 * only the typeface, the palette behind the sixteen colours, and emphasis.
 */
export class TypographicTileset implements Tileset {
  readonly id = "typographic";
  readonly pixelArt = false;
  readonly cellSize: CellSize;
  readonly font: string;

  constructor(
    readonly style: TypographicStyle,
    private readonly emphasis: EmphasisReader,
    measure: (font: string) => number,
  ) {
    this.font = `${style.fontSize}px ${style.fontFamily}`;
    this.cellSize = {
      width: Math.ceil(measure(this.font)),
      height: Math.round(style.fontSize * style.lineHeight),
    };
  }

  beneath(): null {
    return null;
  }

  resolve(glyph: GlyphInfo): Drawable {
    return {
      kind: "text",
      text: glyph.symbol,
      color: colorFromPalette(this.style.palette, glyph.color),
      font: this.font,
      emphasis: this.emphasis.read(glyph),
    };
  }
}

/** Measures the advance width of one character in the given font using a scratch canvas. */
export function measureWithCanvas(font: string): number {
  const context = document.createElement("canvas").getContext("2d");
  if (context === null) return 10;
  context.font = font;
  return context.measureText("M").width;
}
