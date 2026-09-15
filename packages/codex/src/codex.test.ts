import { describe, expect, it } from "vitest";
import { browse } from "./browse.js";
import { patternMatches } from "./descriptions.js";
import { monsterName } from "./entities.js";
import { OFFICIAL_DATA, officialCodex } from "./official.js";

const codex = officialCodex();
const layout = OFFICIAL_DATA.layout;

describe("official codex", () => {
  it("classifies monster, pet and object glyphs back to their tables", () => {
    const ant = OFFICIAL_DATA.monsters.findIndex((monster) => monsterName(monster) === "giant ant");
    expect(codex.glyphs.classify(layout.GLYPH_MON_OFF + ant)).toEqual({
      kind: "monster",
      index: ant,
      female: false,
      variant: "normal",
      pileTop: false,
    });
    expect(codex.glyphs.classify(layout.GLYPH_PET_FEM_OFF + ant)).toMatchObject({
      kind: "monster",
      index: ant,
      female: true,
      variant: "pet",
    });
    const sword = OFFICIAL_DATA.objects.findIndex((object) => object.name === "long sword");
    expect(codex.glyphs.classify(layout.GLYPH_OBJ_OFF + sword)).toEqual({
      kind: "object",
      index: sword,
      pileTop: false,
    });
  });

  it("maps wall glyphs of every branch to the same wall symbols", () => {
    const main = codex.glyphs.classify(layout.GLYPH_CMAP_MAIN_OFF);
    const mines = codex.glyphs.classify(layout.GLYPH_CMAP_MINES_OFF);
    expect(main).toMatchObject({ kind: "terrain", symbol: layout.S_vwall, branch: "main" });
    expect(mines).toMatchObject({ kind: "terrain", symbol: layout.S_vwall, branch: "mines" });
    expect(codex.terrain(layout.S_vwall)?.symbol).toBe("|");
  });

  it("serves the floating eye's official description verbatim", () => {
    const page = codex.search("floating eye")[0];
    expect(page?.ref.kind).toBe("monster");
    expect(page?.description?.source).toBe("official");
    expect(page?.description?.text.startsWith("\tFloating eyes, not surprisingly")).toBe(true);
  });

  it("honours wildcard and exclusion keys like the engine", () => {
    expect(patternMatches("orc*", "orc mummy")).toBe(true);
    expect(patternMatches("orc ??m*", "orc mummy")).toBe(true);
    expect(codex.search("orc mummy")[0]?.description).not.toBeNull();
  });

  it("knows Excalibur as an artifact page over a long sword", () => {
    const page = codex.search("Excalibur").find((candidate) => candidate.ref.kind === "artifact");
    expect(page?.symbol).toBe(")");
    expect(page?.description?.source).toBe("official");
    expect(page?.description?.text.startsWith("\tAt first only its tip was visible")).toBe(true);
  });
});

describe("browsing by the engine's classes", () => {
  it("groups creatures by monster class with the engine's class description", () => {
    const [creatures] = browse(codex);
    expect(creatures?.title).toBe("Creatures");
    const ants = creatures?.groups.find((group) => group.symbol === "a");
    expect(ants?.title).toBe("ant or other insect");
    expect(ants?.pages.map((page) => page.title)).toContain("giant ant");
  });

  it("groups items by object class and narrows every group with a filter", () => {
    const categories = browse(codex, "sword");
    const items = categories.find((category) => category.id === "object");
    expect(items?.groups.map((group) => group.title)).toEqual(["weapons"]);
    expect(items?.groups[0]?.pages.map((page) => page.title)).toContain("long sword");
    expect(categories.find((category) => category.id === "terrain")?.groups).toEqual([]);
  });
});
