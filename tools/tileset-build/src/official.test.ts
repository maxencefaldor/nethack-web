import { describe, expect, it } from "vitest";
import { desaturate, parseTileMappings, parseTileText, TILE_SIZE } from "./official.ts";

const source = `# test tiles
. = (71, 108, 108)
A = (0, 0, 0)
D = (255, 0, 0)
# tile 0 (dot)
{
${Array.from({ length: TILE_SIZE }, (_, y) => `  ${y === 8 ? ".......DD......." : "................"}`).join("\n")}
}
# tile 1 (black)
{
${Array.from({ length: TILE_SIZE }, () => "  AAAAAAAAAAAAAAAA").join("\n")}
}
`;

describe("official tiles", () => {
  it("rasterises tiles with the background colour as transparency", () => {
    const tiles = parseTileText(source);
    expect(tiles).toHaveLength(2);
    const dot = tiles[0] as Uint8ClampedArray;
    const at = (x: number, y: number) =>
      Array.from(dot.subarray((y * TILE_SIZE + x) * 4, (y * TILE_SIZE + x) * 4 + 4));
    expect(at(0, 0)).toEqual([71, 108, 108, 0]);
    expect(at(7, 8)).toEqual([255, 0, 0, 255]);
    expect(Array.from((tiles[1] as Uint8ClampedArray).subarray(0, 4))).toEqual([0, 0, 0, 255]);
  });

  it("reads glyph to tile mappings from the engine's listing", () => {
    const mapping = parseTileMappings(
      "NUMMONS = 383\nglyph[0000] [0000] giant ant\nglyph[3929] [1272] stone (cmap=0)\n",
    );
    expect(mapping.get(0)).toBe(0);
    expect(mapping.get(3929)).toBe(1272);
  });

  it("derives statues as grey copies that keep transparency", () => {
    const [dot] = parseTileText(source);
    const statue = desaturate(dot as Uint8ClampedArray);
    const pixel = (8 * TILE_SIZE + 7) * 4;
    expect(Array.from(statue.subarray(pixel, pixel + 4))).toEqual([77, 77, 77, 255]);
    expect(statue[3]).toBe(0);
  });
});
