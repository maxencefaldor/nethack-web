import { describe, expect, it } from "vitest";
import { catalog } from "./catalog.ts";
import { PlaceholderGenerator } from "./generators.ts";
import { normalize } from "./normalize.ts";
import { pack } from "./pack.ts";
import { promptFor, seedFor } from "./prompts.ts";
import type { StyleSpecification } from "./style.ts";

const style: StyleSpecification = {
  id: "test",
  name: "Test",
  cellSize: 16,
  generator: { kind: "placeholder" },
  prompt: { prefix: "sprite", suffix: "", perKind: { monster: "a creature" } },
  palette: ["#000000", "#ffffff"],
  seed: 7,
  include: ["monster"],
};

describe("tileset pipeline", () => {
  it("catalogs every monster with the engine's symbol and colour", () => {
    const entries = catalog(["monster"]);
    expect(entries.length).toBeGreaterThan(300);
    expect(entries[0]).toMatchObject({ id: "monster/0", kind: "monster", symbol: "a" });
  });

  it("composes reproducible prompts and seeds", () => {
    const [entry] = catalog(["monster"]);
    if (entry === undefined) throw new Error("no entries");
    expect(promptFor(style, entry)).toBe(
      `sprite. ${entry.name} (${entry.description}). a creature`,
    );
    expect(seedFor(style, entry)).toBe(seedFor(style, entry));
  });

  it("generates, normalises and packs tiles into an atlas with a manifest", async () => {
    const entries = catalog(["monster"]).slice(0, 3);
    const generator = new PlaceholderGenerator();
    const tiles = [];
    for (const entry of entries) {
      const raw = await generator.generate({ entry, prompt: "", seed: 1, size: 16 });
      tiles.push({ id: entry.id, png: await normalize(raw, 16, style.palette) });
    }
    const packed = await pack({ id: "test", name: "Test", size: 16, pixelArt: false }, tiles);
    expect(packed.manifest.cellSize).toEqual({ width: 16, height: 16 });
    expect(Object.keys(packed.manifest.tiles)).toEqual(entries.map((entry) => entry.id));
    expect(packed.manifest.tiles["monster/1"]).toEqual({ x: 16, y: 0 });
    expect(packed.atlas.length).toBeGreaterThan(100);
  });
});
