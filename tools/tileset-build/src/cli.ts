#!/usr/bin/env node
/**
 * tileset-build build <style.json> <output directory>
 *   Runs the generative pipeline: catalog, prompts, generation (cached per
 *   prompt and seed), normalisation, review page, packaging.
 *
 * tileset-build import-official <output directory>
 *   Packages NetHack's own tiles from the engine tree, building the engine's
 *   tilemap tool first if its listing is missing.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { catalog } from "./catalog.ts";
import { generatorFor } from "./generators.ts";
import { normalize } from "./normalize.ts";
import { officialTiles, TILE_SIZE } from "./official.ts";
import { pack } from "./pack.ts";
import { promptFor, seedFor } from "./prompts.ts";
import { reviewPage } from "./review.ts";
import type { StyleSpecification } from "./style.ts";

const tool = resolve(import.meta.dirname, "..");
const repo = resolve(tool, "../..");
const [, , command, ...args] = process.argv;

switch (command) {
  case "build":
    await build(args[0], args[1]);
    break;
  case "import-official":
    await importOfficial(args[0]);
    break;
  default:
    console.error("usage: tileset-build build <style.json> <out> | import-official <out>");
    process.exit(1);
}

async function build(stylePath: string | undefined, outputPath: string | undefined): Promise<void> {
  if (stylePath === undefined || outputPath === undefined) {
    console.error("usage: tileset-build build <style.json> <output directory>");
    process.exit(1);
  }
  const style = JSON.parse(readFileSync(stylePath, "utf8")) as StyleSpecification;
  const output = resolve(outputPath);
  const cache = join(tool, "build", "cache", style.id);
  // Review material stays with the tool; only the atlas and manifest ship.
  const review = join(tool, "build", "review", style.id);
  for (const directory of [output, cache, review]) mkdirSync(directory, { recursive: true });

  const generator = generatorFor(style);
  const entries = catalog(style.include);
  const tiles: {
    id: string;
    png: Uint8Array;
    entry: (typeof entries)[number];
    file: string;
    prompt: string;
  }[] = [];
  let generated = 0;
  for (const entry of entries) {
    const prompt = promptFor(style, entry);
    const seed = seedFor(style, entry);
    const key = createHash("sha256")
      .update(`${generator.id}\n${prompt}\n${seed}\n${style.cellSize}`)
      .digest("hex");
    const cached = join(cache, `${key}.png`);
    let png: Uint8Array;
    if (existsSync(cached)) {
      png = new Uint8Array(readFileSync(cached));
    } else {
      png = await normalize(
        await generator.generate({ entry, prompt, seed, size: style.cellSize }),
        style.cellSize,
        style.palette,
      );
      writeFileSync(cached, png);
      generated += 1;
    }
    const file = `${entry.id.replace("/", "-")}.png`;
    writeFileSync(join(review, file), png);
    tiles.push({ id: entry.id, png, entry, file, prompt });
  }

  const packed = await pack(
    {
      id: style.id,
      name: style.name,
      size: style.cellSize,
      pixelArt: false,
      background: "#0f1113",
    },
    tiles,
  );
  writeFileSync(join(output, "atlas.png"), packed.atlas);
  writeFileSync(join(output, "manifest.json"), `${JSON.stringify(packed.manifest, null, 2)}\n`);
  writeFileSync(join(review, "index.html"), reviewPage(style.name, tiles));
  console.log(`${style.name}: ${tiles.length} tiles (${generated} newly generated) -> ${output}`);
  console.log(`Review page: ${join(review, "index.html")}`);
}

async function importOfficial(outputPath: string | undefined): Promise<void> {
  if (outputPath === undefined) {
    console.error("usage: tileset-build import-official <output directory>");
    process.exit(1);
  }
  const engine = join(repo, "packages/engine");
  const share = join(engine, "nethack/win/share");
  const buildDir = join(engine, "build/src");
  const listing = join(buildDir, "util/tilemappings.lst");
  if (!existsSync(listing)) {
    if (!existsSync(join(buildDir, "util/Makefile"))) {
      console.error("Engine build tree not found; run packages/engine/scripts/build.sh first.");
      process.exit(1);
    }
    execFileSync("make", ["tilemap"], { cwd: join(buildDir, "util"), stdio: "inherit" });
    execFileSync("./tilemap", [], { cwd: join(buildDir, "util"), stdio: "inherit" });
  }
  const tiles = officialTiles({
    monsters: readFileSync(join(share, "monsters.txt"), "utf8"),
    objects: readFileSync(join(share, "objects.txt"), "utf8"),
    other: readFileSync(join(share, "other.txt"), "utf8"),
    mappings: readFileSync(listing, "utf8"),
  });
  const output = resolve(outputPath);
  mkdirSync(output, { recursive: true });
  const packed = await pack(
    // The DevTeam's tiles use black for unexplored space and around every sprite.
    {
      id: "official",
      name: "NetHack tiles",
      size: TILE_SIZE,
      pixelArt: true,
      background: "#000000",
    },
    tiles,
  );
  writeFileSync(join(output, "atlas.png"), packed.atlas);
  writeFileSync(join(output, "manifest.json"), `${JSON.stringify(packed.manifest, null, 2)}\n`);
  writeFileSync(
    join(output, "LICENSE"),
    `${readFileSync(join(engine, "nethack/dat/license"), "utf8")}\nThese tiles are the NetHack DevTeam's, from win/share in the NetHack source tree.\n`,
  );
  console.log(`NetHack tiles: ${tiles.length} glyph ids -> ${output}`);
}
