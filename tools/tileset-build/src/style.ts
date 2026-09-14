/**
 * A style specification: everything that makes one tileset look like itself.
 * Different tilesets are different files of this shape; the pipeline is fixed.
 */
export interface StyleSpecification {
  readonly id: string;
  readonly name: string;
  readonly cellSize: number;
  /** Which image generator produces the raw tiles. */
  readonly generator: GeneratorChoice;
  /** Prompt fragments composed for every tile. */
  readonly prompt: {
    readonly prefix: string;
    readonly suffix: string;
    readonly perKind: Readonly<Partial<Record<TileKind, string>>>;
  };
  /** Palette the normaliser quantises to; empty keeps generator colours. */
  readonly palette: readonly string[];
  /** Deterministic seed base; a tile's seed is derived from it and its id. */
  readonly seed: number;
  /** Which tiles to make; missing kinds fall back to characters at runtime. */
  readonly include: readonly TileKind[];
}

export type TileKind = "monster" | "object" | "terrain";

export type GeneratorChoice =
  | { readonly kind: "placeholder" }
  | { readonly kind: "openai-images"; readonly model: string; readonly size: string };
