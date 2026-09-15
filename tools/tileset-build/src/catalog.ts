import { monsterName, OFFICIAL_DATA } from "@nethack-web/codex";
import { paletteColor } from "./palette.ts";
import type { TileKind } from "./style.ts";

/** One tile to produce: its stable id, what it depicts, and how the engine draws it. */
export interface CatalogEntry {
  readonly id: string;
  readonly kind: TileKind;
  readonly name: string;
  readonly description: string;
  readonly symbol: string;
  readonly color: string;
}

/** Every tile a complete tileset would contain, straight from the extracted engine data. */
export function catalog(include: readonly TileKind[]): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  if (include.includes("monster")) {
    for (const monster of OFFICIAL_DATA.monsters) {
      const name = monsterName(monster);
      const classDescription =
        OFFICIAL_DATA.symbols.monsterClasses[monster.classIndex]?.description ?? "";
      entries.push({
        id: `monster/${monster.index}`,
        kind: "monster",
        name,
        description: classDescription,
        symbol: monster.symbol,
        color: paletteColor(monster.color),
      });
    }
  }
  if (include.includes("object")) {
    for (const object of OFFICIAL_DATA.objects) {
      if (
        object.name === null ||
        object.name.startsWith("generic") ||
        object.name === "strange object"
      )
        continue;
      entries.push({
        id: `object/${object.index}`,
        kind: "object",
        name: object.name,
        description: object.description ?? object.className,
        symbol: object.classSymbol,
        color: paletteColor(object.color),
      });
    }
  }
  if (include.includes("terrain")) {
    for (const terrain of OFFICIAL_DATA.symbols.terrain) {
      if (terrain.description === null || terrain.description === "") continue;
      entries.push({
        id: `terrain/${terrain.index}`,
        kind: "terrain",
        name: terrain.description,
        description: "dungeon feature",
        symbol: terrain.symbol,
        color: paletteColor(terrain.color),
      });
    }
  }
  return entries;
}
