import type { GlyphClassifier, GlyphInfo } from "@nethack-web/protocol";
import { glyphKeyFallbackIds, glyphKeyId } from "@nethack-web/protocol";
import type { EmphasisReader } from "./emphasis.js";
import type { CellSize, Drawable, Tileset } from "./tileset.js";

/** A tileset package: one atlas image and where each tile sits in it, keyed by glyph key id. */
export interface TilesetManifest {
  readonly id: string;
  readonly name: string;
  readonly cellSize: CellSize;
  /** Atlas image path, relative to the manifest. */
  readonly atlas: string;
  readonly pixelArt: boolean;
  readonly tiles: Readonly<Record<string, { readonly x: number; readonly y: number }>>;
}

/**
 * Draws sprites from an atlas, falling back per glyph: an exact tile, then a
 * less specific one (a pet uses its monster's tile), then whatever the
 * fallback tileset draws. An unfinished tileset is therefore always playable.
 */
export class AtlasTileset implements Tileset {
  readonly id: string;
  readonly cellSize: CellSize;
  readonly pixelArt: boolean;

  constructor(
    private readonly manifest: TilesetManifest,
    private readonly image: CanvasImageSource,
    private readonly classifier: GlyphClassifier,
    private readonly emphasis: EmphasisReader,
    private readonly fallback: Tileset,
  ) {
    this.id = manifest.id;
    this.cellSize = manifest.cellSize;
    this.pixelArt = manifest.pixelArt;
  }

  resolve(glyph: GlyphInfo): Drawable {
    const key = this.classifier.classify(glyph.glyph);
    if (key !== null) {
      for (const id of [glyphKeyId(key), ...glyphKeyFallbackIds(key)]) {
        const tile = this.manifest.tiles[id];
        if (tile !== undefined) {
          return {
            kind: "sprite",
            image: this.image,
            sourceX: tile.x,
            sourceY: tile.y,
            sourceWidth: this.cellSize.width,
            sourceHeight: this.cellSize.height,
            emphasis: this.emphasis.read(glyph),
          };
        }
      }
    }
    return this.fallback.resolve(glyph);
  }
}
