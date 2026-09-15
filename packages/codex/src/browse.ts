import type { Codex, CodexPage } from "./codex.js";
import type { EntityRef } from "./entities.js";

/** The engine's own taxonomy: one tab per entity kind, groups within it per engine class. */
export type CategoryId = EntityRef["kind"];

export interface CategoryGroup {
  readonly id: string;
  /** The engine's description of the class, e.g. "ant or other insect" or "weapons". */
  readonly title: string;
  /** The class symbol the engine draws it with. */
  readonly symbol: string;
  readonly pages: readonly CodexPage[];
}

export interface Category {
  readonly id: CategoryId;
  readonly title: string;
  readonly groups: readonly CategoryGroup[];
}

const TITLES: Readonly<Record<CategoryId, string>> = {
  monster: "Creatures",
  object: "Items",
  artifact: "Artifacts",
  terrain: "Dungeon features",
};

export function categoryTitle(id: CategoryId): string {
  return TITLES[id];
}

/** All pages arranged as the engine classifies them; `filter` narrows every group. */
export function browse(codex: Codex, filter = ""): Category[] {
  const needle = filter.trim().toLowerCase();
  const matches = (page: CodexPage) => needle === "" || page.title.toLowerCase().includes(needle);
  const groups = new Map<
    CategoryId,
    Map<string, { title: string; symbol: string; pages: CodexPage[] }>
  >();
  const put = (
    kind: CategoryId,
    groupId: string,
    title: string,
    symbol: string,
    page: CodexPage,
  ) => {
    let byKind = groups.get(kind);
    if (byKind === undefined) {
      byKind = new Map();
      groups.set(kind, byKind);
    }
    let group = byKind.get(groupId);
    if (group === undefined) {
      group = { title, symbol, pages: [] };
      byKind.set(groupId, group);
    }
    group.pages.push(page);
  };
  for (const ref of codex.all()) {
    const page = codex.page(ref);
    if (page === null || !matches(page)) continue;
    switch (ref.kind) {
      case "monster": {
        const monster = codex.monster(ref.index);
        const cls =
          monster === null ? undefined : codex.data.symbols.monsterClasses[monster.classIndex];
        put(
          "monster",
          `class-${monster?.classIndex ?? 0}`,
          cls?.description || "other creatures",
          cls?.symbol ?? "?",
          page,
        );
        break;
      }
      case "object": {
        const object = codex.object(ref.index);
        put(
          "object",
          `class-${object?.classIndex ?? 0}`,
          object?.className ?? "other items",
          object?.classSymbol ?? "?",
          page,
        );
        break;
      }
      case "artifact":
        put("artifact", "artifacts", "artifacts", "*", page);
        break;
      case "terrain":
        put("terrain", "features", "dungeon features", "#", page);
        break;
    }
  }
  return (["monster", "object", "artifact", "terrain"] as const).map((id) => ({
    id,
    title: TITLES[id],
    groups: [...(groups.get(id) ?? new Map()).entries()].map(([groupId, group]) => ({
      id: groupId,
      title: group.title,
      symbol: group.symbol,
      pages: group.pages,
    })),
  }));
}
