import type { GlyphInfo, GlyphLayout } from "@nethack-web/protocol";
import { GlyphClassifier, glyphKeyFallbackIds, glyphKeyId } from "@nethack-web/protocol";
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
  /** Ground colour the tiles were drawn on. */
  readonly background: string;
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
  readonly background: string;
  private readonly classifier: GlyphClassifier;
  private readonly floorId: string;

  constructor(
    private readonly manifest: TilesetManifest,
    private readonly image: CanvasImageSource,
    layout: GlyphLayout,
    private readonly emphasis: EmphasisReader,
    private readonly fallback: Tileset,
  ) {
    this.id = manifest.id;
    this.cellSize = manifest.cellSize;
    this.pixelArt = manifest.pixelArt;
    this.background = manifest.background;
    this.classifier = new GlyphClassifier(layout);
    this.floorId = `terrain/${layout.S_room}`;
  }

  resolve(glyph: GlyphInfo): Drawable {
    const key = this.classifier.classify(glyph.glyph);
    if (key !== null) {
      for (const id of [glyphKeyId(key), ...glyphKeyFallbackIds(key)]) {
        const sprite = this.sprite(id, glyph);
        if (sprite !== null) return sprite;
      }
    }
    return this.fallback.resolve(glyph);
  }

  beneath(glyph: GlyphInfo): Drawable | null {
    const key = this.classifier.classify(glyph.glyph);
    if (key === null) return null;
    switch (key.kind) {
      case "monster":
      case "corpse":
      case "object":
        return this.sprite(this.floorId, glyph);
      default:
        return null;
    }
  }

  private sprite(id: string, glyph: GlyphInfo): Drawable | null {
    const tile = this.manifest.tiles[id];
    if (tile === undefined) return null;
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
