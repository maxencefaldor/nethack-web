/**
 * Imports NetHack's own tiles from the engine tree.
 *
 * Sources, all part of the engine and under its licence:
 *   win/share/{monsters,objects,other}.txt   16 by 16 tiles as text with a palette
 *   util/tilemappings.lst                    glyph number to tile number, written
 *                                            by the engine's tilemap tool
 * Statue glyphs map to tile numbers the engine derives rather than draws; they
 * are derived here the same way, as the desaturated monster tile.
 */
import { createCanvas } from "@napi-rs/canvas";
import { OFFICIAL_DATA } from "@nethack-web/codex";
import { GlyphClassifier, glyphKeyId } from "@nethack-web/protocol";

export const TILE_SIZE = 16;

/** The palette colour the tile files use for "nothing here". */
const TRANSPARENT: readonly [number, number, number] = [71, 108, 108];

export type Rgba = Uint8ClampedArray;

/** Parses one tile text file into RGBA tiles in file order. */
export function parseTileText(source: string): Rgba[] {
  const palette = new Map<string, readonly [number, number, number]>();
  const tiles: Rgba[] = [];
  let rows: string[] | null = null;
  for (const line of source.split("\n")) {
    const color = /^(.) = \((\d+), (\d+), (\d+)\)/.exec(line);
    if (color !== null) {
      palette.set(color[1] ?? "", [Number(color[2]), Number(color[3]), Number(color[4])]);
      continue;
    }
    if (line.startsWith("{")) {
      rows = [];
      continue;
    }
    if (line.startsWith("}") && rows !== null) {
      tiles.push(rasterise(rows, palette));
      rows = null;
      continue;
    }
    if (rows !== null && line.trim() !== "") rows.push(line.trim());
  }
  return tiles;
}

function rasterise(
  rows: readonly string[],
  palette: ReadonlyMap<string, readonly [number, number, number]>,
): Rgba {
  const pixels = new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4);
  for (let y = 0; y < TILE_SIZE; y += 1) {
    const row = rows[y] ?? "";
    for (let x = 0; x < TILE_SIZE; x += 1) {
      const color = palette.get(row[x] ?? ".") ?? TRANSPARENT;
      const offset = (y * TILE_SIZE + x) * 4;
      const transparent =
        color[0] === TRANSPARENT[0] && color[1] === TRANSPARENT[1] && color[2] === TRANSPARENT[2];
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = transparent ? 0 : 255;
    }
  }
  return pixels;
}

/** Glyph number to tile number, from the engine's tilemap listing. */
export function parseTileMappings(listing: string): Map<number, number> {
  const mapping = new Map<number, number>();
  for (const line of listing.split("\n")) {
    const match = /^glyph\[(\d+)\] \[(\d+)\]/.exec(line);
    if (match !== null) mapping.set(Number(match[1]), Number(match[2]));
  }
  return mapping;
}

/** A statue is the engine's own convention: the monster's tile in grey. */
export function desaturate(tile: Rgba): Rgba {
  const out = new Uint8ClampedArray(tile);
  for (let offset = 0; offset < out.length; offset += 4) {
    const grey = Math.round(
      0.3 * (out[offset] ?? 0) + 0.59 * (out[offset + 1] ?? 0) + 0.11 * (out[offset + 2] ?? 0),
    );
    out[offset] = grey;
    out[offset + 1] = grey;
    out[offset + 2] = grey;
  }
  return out;
}

export function toPng(tile: Rgba): Uint8Array {
  const canvas = createCanvas(TILE_SIZE, TILE_SIZE);
  const context = canvas.getContext("2d");
  context.putImageData(context.createImageData(TILE_SIZE, TILE_SIZE), 0, 0);
  const image = context.createImageData(TILE_SIZE, TILE_SIZE);
  image.data.set(tile);
  context.putImageData(image, 0, 0);
  return new Uint8Array(canvas.toBuffer("image/png"));
}

export interface OfficialSources {
  readonly monsters: string;
  readonly objects: string;
  readonly other: string;
  readonly mappings: string;
}

/**
 * Every glyph key id the engine can draw, with its tile. Ids whose glyphs share
 * a tile share the same PNG object so the packer stores it once.
 */
export function officialTiles(sources: OfficialSources): { id: string; png: Uint8Array }[] {
  const drawn = [
    ...parseTileText(sources.monsters),
    ...parseTileText(sources.objects),
    ...parseTileText(sources.other),
  ];
  const mapping = parseTileMappings(sources.mappings);
  const layout = OFFICIAL_DATA.layout;
  const classifier = new GlyphClassifier(layout);
  const pngs = new Map<string, Uint8Array>();
  const pngFor = (cacheKey: string, make: () => Rgba): Uint8Array => {
    let png = pngs.get(cacheKey);
    if (png === undefined) {
      png = toPng(make());
      pngs.set(cacheKey, png);
    }
    return png;
  };
  const result: { id: string; png: Uint8Array }[] = [];
  const seen = new Set<string>();
  for (let glyph = 0; glyph < layout.MAX_GLYPH; glyph += 1) {
    const key = classifier.classify(glyph);
    if (key === null) continue;
    const id = glyphKeyId(key);
    if (seen.has(id)) continue;
    const tile = mapping.get(glyph);
    if (tile === undefined) continue;
    let png: Uint8Array | null = null;
    if (tile < drawn.length) {
      png = pngFor(`tile:${tile}`, () => drawn[tile] as Rgba);
    } else if (key.kind === "monster" && key.variant === "statue") {
      const base = (key.female ? layout.GLYPH_MON_FEM_OFF : layout.GLYPH_MON_OFF) + key.index;
      const baseTile = mapping.get(base);
      if (baseTile !== undefined && baseTile < drawn.length) {
        png = pngFor(`statue:${baseTile}`, () => desaturate(drawn[baseTile] as Rgba));
      }
    }
    if (png === null) continue;
    seen.add(id);
    result.push({ id, png });
  }
  return result;
}
