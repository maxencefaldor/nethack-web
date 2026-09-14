import { GlyphClassifier, type GlyphKey, type GlyphLayout } from "@nethack-web/protocol";
import type { Description, DescriptionSource } from "./descriptions.js";
import {
  type Artifact,
  type EntityRef,
  type Monster,
  monsterName,
  type ObjectKind,
  type Symbols,
  type TerrainSymbol,
} from "./entities.js";

export interface CodexData {
  readonly monsters: readonly Monster[];
  readonly objects: readonly ObjectKind[];
  readonly artifacts: readonly Artifact[];
  readonly symbols: Symbols;
  readonly layout: GlyphLayout;
}

export interface CodexPage {
  readonly ref: EntityRef;
  readonly title: string;
  readonly symbol: string;
  readonly color: number;
  readonly description: Description | null;
}

/** One entry point to everything the encyclopedia knows. */
export class Codex {
  readonly glyphs: GlyphClassifier;

  constructor(
    readonly data: CodexData,
    private readonly descriptions: DescriptionSource,
  ) {
    this.glyphs = new GlyphClassifier(data.layout);
  }

  monster(index: number): Monster | null {
    return this.data.monsters[index] ?? null;
  }

  object(index: number): ObjectKind | null {
    return this.data.objects[index] ?? null;
  }

  artifact(index: number): Artifact | null {
    return this.data.artifacts.find((artifact) => artifact.index === index) ?? null;
  }

  terrain(symbol: number): TerrainSymbol | null {
    return this.data.symbols.terrain[symbol] ?? null;
  }

  /** The page a map glyph should open, if it shows something describable. */
  entityForGlyph(glyph: number): EntityRef | null {
    const key = this.glyphs.classify(glyph);
    return key === null ? null : this.entityForKey(key);
  }

  entityForKey(key: GlyphKey): EntityRef | null {
    switch (key.kind) {
      case "monster":
        return { kind: "monster", index: key.index };
      case "corpse":
        return { kind: "monster", index: key.monster };
      case "object":
        return { kind: "object", index: key.index };
      case "terrain":
        return { kind: "terrain", index: key.symbol };
      case "zap":
      case "explosion":
      case "swallow":
        return { kind: "terrain", index: key.symbol };
      case "warning":
      case "invisible":
      case "unexplored":
      case "nothing":
        return null;
    }
  }

  page(ref: EntityRef): CodexPage | null {
    switch (ref.kind) {
      case "monster": {
        const monster = this.monster(ref.index);
        if (monster === null) return null;
        const title = monsterName(monster);
        return {
          ref,
          title,
          symbol: monster.symbol,
          color: monster.color,
          description: this.describeAny([
            title,
            ...monster.names.filter((n): n is string => n !== null),
          ]),
        };
      }
      case "object": {
        const object = this.object(ref.index);
        if (object === null || object.name === null) return null;
        return {
          ref,
          title: object.name,
          symbol: object.classSymbol,
          color: object.color,
          description: this.describeAny([object.name, object.description ?? ""]),
        };
      }
      case "artifact": {
        const artifact = this.artifact(ref.index);
        if (artifact === null) return null;
        const base = this.object(artifact.objectIndex);
        return {
          ref,
          title: artifact.name,
          symbol: base?.classSymbol ?? "*",
          color: base?.color ?? 0,
          description: this.describeAny([artifact.name]),
        };
      }
      case "terrain": {
        const terrain = this.terrain(ref.index);
        if (terrain === null || terrain.description === null) return null;
        return {
          ref,
          title: terrain.description,
          symbol: terrain.symbol,
          color: terrain.color,
          description: this.describeAny([terrain.description]),
        };
      }
    }
  }

  /** Every page, for browsing: monsters, then objects with names, then artifacts, then terrain. */
  all(): EntityRef[] {
    return [
      ...this.data.monsters.map(
        (monster): EntityRef => ({ kind: "monster", index: monster.index }),
      ),
      ...this.data.objects
        .filter(
          (object) =>
            object.name !== null &&
            !object.name.startsWith("generic") &&
            object.name !== "strange object",
        )
        .map((object): EntityRef => ({ kind: "object", index: object.index })),
      ...this.data.artifacts.map(
        (artifact): EntityRef => ({ kind: "artifact", index: artifact.index }),
      ),
      ...this.data.symbols.terrain
        .filter((terrain) => terrain.description !== null && terrain.description !== "")
        .map((terrain): EntityRef => ({ kind: "terrain", index: terrain.index })),
    ];
  }

  search(query: string, limit = 50): CodexPage[] {
    const needle = query.trim().toLowerCase();
    const pages: CodexPage[] = [];
    for (const ref of this.all()) {
      const page = this.page(ref);
      if (page === null) continue;
      if (needle === "" || page.title.toLowerCase().includes(needle)) pages.push(page);
      if (pages.length >= limit) break;
    }
    return pages;
  }

  private describeAny(names: readonly string[]): Description | null {
    for (const name of names) {
      if (name === "") continue;
      const description = this.descriptions.describe(name);
      if (description !== null) return description;
    }
    return null;
  }
}
