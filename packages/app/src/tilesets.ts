import type { GlyphLayout, Vocabulary } from "@nethack-web/protocol";
import {
  AtlasTileset,
  DEFAULT_TYPOGRAPHIC_STYLE,
  EmphasisReader,
  measureWithCanvas,
  type Tileset,
  type TilesetManifest,
  TypographicTileset,
} from "@nethack-web/renderer";

/** A tileset the player can choose, before it is loaded. */
export interface TilesetChoice {
  readonly id: string;
  readonly name: string;
}

export const TYPOGRAPHIC: TilesetChoice = { id: "typographic", name: "Characters" };

/**
 * Finds installed tileset packages (`public/tilesets/<id>/manifest.json`) and
 * builds tilesets on demand. Sprite tilesets always fall back to characters
 * per glyph, so a partial package is still playable.
 */
export class TilesetRegistry {
  private readonly manifests = new Map<string, TilesetManifest>();

  constructor(private readonly base = "/tilesets/") {}

  async choices(): Promise<readonly TilesetChoice[]> {
    const index = await this.fetchJson<{ readonly tilesets: readonly string[] }>("index.json");
    const choices: TilesetChoice[] = [TYPOGRAPHIC];
    for (const id of index?.tilesets ?? []) {
      const manifest = await this.manifest(id);
      if (manifest !== null) choices.push({ id: manifest.id, name: manifest.name });
    }
    return choices;
  }

  async load(id: string, vocabulary: Vocabulary, layout: GlyphLayout): Promise<Tileset> {
    const emphasis = new EmphasisReader(vocabulary);
    const typographic = new TypographicTileset(
      DEFAULT_TYPOGRAPHIC_STYLE,
      emphasis,
      measureWithCanvas,
    );
    if (id === TYPOGRAPHIC.id) return typographic;
    const manifest = await this.manifest(id);
    if (manifest === null) return typographic;
    const image = await loadImage(`${this.base}${id}/${manifest.atlas}`);
    return image === null
      ? typographic
      : new AtlasTileset(manifest, image, layout, emphasis, typographic);
  }

  private async manifest(id: string): Promise<TilesetManifest | null> {
    const cached = this.manifests.get(id);
    if (cached !== undefined) return cached;
    const manifest = await this.fetchJson<TilesetManifest>(`${id}/manifest.json`);
    if (manifest !== null) this.manifests.set(id, manifest);
    return manifest;
  }

  private async fetchJson<T>(path: string): Promise<T | null> {
    try {
      const response = await fetch(`${this.base}${path}`);
      if (!response.ok) return null;
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}
