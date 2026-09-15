import { createCanvas, loadImage } from "@napi-rs/canvas";

export interface PackedTileset {
  readonly atlas: Uint8Array;
  readonly manifest: {
    readonly id: string;
    readonly name: string;
    readonly cellSize: { readonly width: number; readonly height: number };
    readonly atlas: string;
    readonly pixelArt: boolean;
    readonly background: string;
    readonly tiles: Record<string, { readonly x: number; readonly y: number }>;
  };
}

export interface PackOptions {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly pixelArt: boolean;
  /** Ground colour the tiles are drawn on. */
  readonly background: string;
}

/**
 * Lays tiles out in a square-ish grid and records where each id landed.
 * Ids that share the same image object share one atlas cell.
 */
export async function pack(
  options: PackOptions,
  tiles: readonly { readonly id: string; readonly png: Uint8Array }[],
): Promise<PackedTileset> {
  const images: Uint8Array[] = [];
  const cellOf = new Map<Uint8Array, number>();
  for (const tile of tiles) {
    if (!cellOf.has(tile.png)) {
      cellOf.set(tile.png, images.length);
      images.push(tile.png);
    }
  }
  const columns = Math.max(1, Math.ceil(Math.sqrt(images.length)));
  const rows = Math.max(1, Math.ceil(images.length / columns));
  const position = (cell: number) => ({
    x: (cell % columns) * options.size,
    y: Math.floor(cell / columns) * options.size,
  });
  const canvas = createCanvas(columns * options.size, rows * options.size);
  const context = canvas.getContext("2d");
  for (const [cell, png] of images.entries()) {
    const { x, y } = position(cell);
    context.drawImage(await loadImage(Buffer.from(png)), x, y, options.size, options.size);
  }
  const positions: Record<string, { x: number; y: number }> = {};
  for (const tile of tiles) positions[tile.id] = position(cellOf.get(tile.png) ?? 0);
  return {
    atlas: new Uint8Array(canvas.toBuffer("image/png")),
    manifest: {
      id: options.id,
      name: options.name,
      cellSize: { width: options.size, height: options.size },
      atlas: "atlas.png",
      pixelArt: options.pixelArt,
      background: options.background,
      tiles: positions,
    },
  };
}
