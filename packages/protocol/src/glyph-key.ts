/**
 * Classifies engine glyph numbers using the offsets extracted from display.h.
 *
 * The engine packs every drawable thing into one integer space; the layout
 * comes from the same engine build as the data, so nothing here is guessed.
 */
export interface GlyphLayout {
  readonly NUMMONS: number;
  readonly NUM_OBJECTS: number;
  readonly MAXPCHARS: number;
  readonly MAXEXPCHARS: number;
  readonly NUM_ZAP: number;
  readonly WARNCOUNT: number;
  readonly GLYPH_MON_OFF: number;
  readonly GLYPH_MON_FEM_OFF: number;
  readonly GLYPH_PET_OFF: number;
  readonly GLYPH_PET_FEM_OFF: number;
  readonly GLYPH_INVIS_OFF: number;
  readonly GLYPH_DETECT_OFF: number;
  readonly GLYPH_DETECT_FEM_OFF: number;
  readonly GLYPH_BODY_OFF: number;
  readonly GLYPH_RIDDEN_OFF: number;
  readonly GLYPH_RIDDEN_FEM_OFF: number;
  readonly GLYPH_OBJ_OFF: number;
  readonly GLYPH_CMAP_OFF: number;
  readonly GLYPH_CMAP_STONE_OFF: number;
  readonly GLYPH_CMAP_MAIN_OFF: number;
  readonly GLYPH_CMAP_MINES_OFF: number;
  readonly GLYPH_CMAP_GEH_OFF: number;
  readonly GLYPH_CMAP_KNOX_OFF: number;
  readonly GLYPH_CMAP_SOKO_OFF: number;
  readonly GLYPH_CMAP_A_OFF: number;
  readonly GLYPH_ALTAR_OFF: number;
  readonly GLYPH_CMAP_B_OFF: number;
  readonly GLYPH_ZAP_OFF: number;
  readonly GLYPH_CMAP_C_OFF: number;
  readonly GLYPH_SWALLOW_OFF: number;
  readonly GLYPH_EXPLODE_OFF: number;
  readonly GLYPH_WARNING_OFF: number;
  readonly GLYPH_STATUE_OFF: number;
  readonly GLYPH_STATUE_FEM_OFF: number;
  readonly GLYPH_PILETOP_OFF: number;
  readonly GLYPH_OBJ_PILETOP_OFF: number;
  readonly GLYPH_BODY_PILETOP_OFF: number;
  readonly GLYPH_STATUE_MALE_PILETOP_OFF: number;
  readonly GLYPH_STATUE_FEM_PILETOP_OFF: number;
  readonly GLYPH_UNEXPLORED_OFF: number;
  readonly GLYPH_NOTHING_OFF: number;
  readonly MAX_GLYPH: number;
  readonly S_stone: number;
  readonly S_vwall: number;
  readonly S_trwall: number;
  readonly S_ndoor: number;
  readonly S_brdnladder: number;
  readonly S_altar: number;
  readonly S_grave: number;
  readonly S_arrow_trap: number;
  readonly MAXTCHARS: number;
  readonly S_digbeam: number;
  readonly S_goodpos: number;
  readonly S_vbeam: number;
  readonly S_expl_tl: number;
  readonly S_sw_tl: number;
}

export type MonsterVariant = "normal" | "pet" | "detected" | "ridden" | "statue";

export type GlyphKey =
  | {
      readonly kind: "monster";
      readonly index: number;
      readonly female: boolean;
      readonly variant: MonsterVariant;
      readonly pileTop: boolean;
    }
  | { readonly kind: "corpse"; readonly monster: number; readonly pileTop: boolean }
  | { readonly kind: "object"; readonly index: number; readonly pileTop: boolean }
  | {
      readonly kind: "terrain";
      /** Index into the terrain symbol table (S_*). */
      readonly symbol: number;
      /** Which wall set the glyph came from; the symbol is the same. */
      readonly branch: "main" | "mines" | "gehennom" | "knox" | "sokoban";
    }
  | { readonly kind: "zap"; readonly beam: number; readonly symbol: number }
  | { readonly kind: "explosion"; readonly style: number; readonly symbol: number }
  | { readonly kind: "swallow"; readonly monster: number; readonly symbol: number }
  | { readonly kind: "warning"; readonly level: number }
  | { readonly kind: "invisible" }
  | { readonly kind: "unexplored" }
  | { readonly kind: "nothing" };

export class GlyphClassifier {
  constructor(private readonly layout: GlyphLayout) {}

  classify(glyph: number): GlyphKey | null {
    const l = this.layout;
    if (glyph < 0 || glyph >= l.MAX_GLYPH) return null;
    if (glyph >= l.GLYPH_NOTHING_OFF) return { kind: "nothing" };
    if (glyph >= l.GLYPH_UNEXPLORED_OFF) return { kind: "unexplored" };
    if (glyph >= l.GLYPH_PILETOP_OFF) return this.pileTop(glyph);
    if (glyph >= l.GLYPH_STATUE_OFF) {
      return this.monster(glyph, l.GLYPH_STATUE_OFF, l.GLYPH_STATUE_FEM_OFF, "statue", false);
    }
    if (glyph >= l.GLYPH_WARNING_OFF)
      return { kind: "warning", level: glyph - l.GLYPH_WARNING_OFF };
    if (glyph >= l.GLYPH_EXPLODE_OFF) {
      const offset = glyph - l.GLYPH_EXPLODE_OFF;
      return {
        kind: "explosion",
        style: Math.floor(offset / l.MAXEXPCHARS),
        symbol: l.S_expl_tl + (offset % l.MAXEXPCHARS),
      };
    }
    if (glyph >= l.GLYPH_SWALLOW_OFF) {
      const offset = glyph - l.GLYPH_SWALLOW_OFF;
      return { kind: "swallow", monster: Math.floor(offset / 8), symbol: l.S_sw_tl + (offset % 8) };
    }
    if (glyph >= l.GLYPH_CMAP_C_OFF) {
      return {
        kind: "terrain",
        symbol: l.S_digbeam + (glyph - l.GLYPH_CMAP_C_OFF),
        branch: "main",
      };
    }
    if (glyph >= l.GLYPH_ZAP_OFF) {
      const offset = glyph - l.GLYPH_ZAP_OFF;
      return { kind: "zap", beam: Math.floor(offset / 4), symbol: l.S_vbeam + (offset % 4) };
    }
    if (glyph >= l.GLYPH_CMAP_B_OFF) {
      return { kind: "terrain", symbol: l.S_grave + (glyph - l.GLYPH_CMAP_B_OFF), branch: "main" };
    }
    if (glyph >= l.GLYPH_ALTAR_OFF) return { kind: "terrain", symbol: l.S_altar, branch: "main" };
    if (glyph >= l.GLYPH_CMAP_A_OFF) {
      return { kind: "terrain", symbol: l.S_ndoor + (glyph - l.GLYPH_CMAP_A_OFF), branch: "main" };
    }
    if (glyph >= l.GLYPH_CMAP_MAIN_OFF) return this.wall(glyph);
    if (glyph >= l.GLYPH_CMAP_OFF) return { kind: "terrain", symbol: l.S_stone, branch: "main" };
    if (glyph >= l.GLYPH_OBJ_OFF) {
      return { kind: "object", index: glyph - l.GLYPH_OBJ_OFF, pileTop: false };
    }
    if (glyph >= l.GLYPH_RIDDEN_OFF) {
      return this.monster(glyph, l.GLYPH_RIDDEN_OFF, l.GLYPH_RIDDEN_FEM_OFF, "ridden", false);
    }
    if (glyph >= l.GLYPH_BODY_OFF) {
      return { kind: "corpse", monster: glyph - l.GLYPH_BODY_OFF, pileTop: false };
    }
    if (glyph >= l.GLYPH_DETECT_OFF) {
      return this.monster(glyph, l.GLYPH_DETECT_OFF, l.GLYPH_DETECT_FEM_OFF, "detected", false);
    }
    if (glyph >= l.GLYPH_INVIS_OFF) return { kind: "invisible" };
    if (glyph >= l.GLYPH_PET_OFF) {
      return this.monster(glyph, l.GLYPH_PET_OFF, l.GLYPH_PET_FEM_OFF, "pet", false);
    }
    return this.monster(glyph, l.GLYPH_MON_OFF, l.GLYPH_MON_FEM_OFF, "normal", false);
  }

  private monster(
    glyph: number,
    base: number,
    femaleBase: number,
    variant: MonsterVariant,
    pileTop: boolean,
  ): GlyphKey {
    const female = glyph >= femaleBase;
    return {
      kind: "monster",
      index: glyph - (female ? femaleBase : base),
      female,
      variant,
      pileTop,
    };
  }

  private wall(glyph: number): GlyphKey {
    const l = this.layout;
    const wallCount = l.S_trwall - l.S_vwall + 1;
    const sets: {
      readonly offset: number;
      readonly branch: Extract<GlyphKey, { kind: "terrain" }>["branch"];
    }[] = [
      { offset: l.GLYPH_CMAP_SOKO_OFF, branch: "sokoban" },
      { offset: l.GLYPH_CMAP_KNOX_OFF, branch: "knox" },
      { offset: l.GLYPH_CMAP_GEH_OFF, branch: "gehennom" },
      { offset: l.GLYPH_CMAP_MINES_OFF, branch: "mines" },
      { offset: l.GLYPH_CMAP_MAIN_OFF, branch: "main" },
    ];
    for (const set of sets) {
      if (glyph >= set.offset) {
        return {
          kind: "terrain",
          symbol: l.S_vwall + ((glyph - set.offset) % wallCount),
          branch: set.branch,
        };
      }
    }
    return { kind: "terrain", symbol: l.S_stone, branch: "main" };
  }

  private pileTop(glyph: number): GlyphKey {
    const l = this.layout;
    if (glyph >= l.GLYPH_STATUE_MALE_PILETOP_OFF) {
      return this.monster(
        glyph,
        l.GLYPH_STATUE_MALE_PILETOP_OFF,
        l.GLYPH_STATUE_FEM_PILETOP_OFF,
        "statue",
        true,
      );
    }
    if (glyph >= l.GLYPH_BODY_PILETOP_OFF) {
      return { kind: "corpse", monster: glyph - l.GLYPH_BODY_PILETOP_OFF, pileTop: true };
    }
    return { kind: "object", index: glyph - l.GLYPH_OBJ_PILETOP_OFF, pileTop: true };
  }
}

/**
 * Stable string identity for a glyph key, used as the tile name in tileset
 * manifests. Most specific first; `fallbackIds` lists what to try next.
 */
export function glyphKeyId(key: GlyphKey): string {
  switch (key.kind) {
    case "monster": {
      const parts = [`monster/${key.index}`];
      if (key.female) parts.push("f");
      if (key.variant !== "normal") parts.push(key.variant);
      return parts.join("/");
    }
    case "corpse":
      return `corpse/${key.monster}`;
    case "object":
      return `object/${key.index}`;
    case "terrain":
      return key.branch === "main"
        ? `terrain/${key.symbol}`
        : `terrain/${key.symbol}/${key.branch}`;
    case "zap":
      return `zap/${key.beam}/${key.symbol}`;
    case "explosion":
      return `explosion/${key.style}/${key.symbol}`;
    case "swallow":
      return `swallow/${key.symbol}`;
    case "warning":
      return `warning/${key.level}`;
    case "invisible":
    case "unexplored":
    case "nothing":
      return key.kind;
  }
}

/** Less specific ids a tileset may have art for, in the order to try them. */
export function glyphKeyFallbackIds(key: GlyphKey): string[] {
  switch (key.kind) {
    case "monster": {
      const ids: string[] = [];
      if (key.variant !== "normal")
        ids.push(key.female ? `monster/${key.index}/f` : `monster/${key.index}`);
      if (key.female)
        ids.push(
          key.variant === "normal" ? `monster/${key.index}` : `monster/${key.index}/${key.variant}`,
        );
      ids.push(`monster/${key.index}`);
      return [...new Set(ids)];
    }
    case "corpse":
      return ["corpse"];
    case "terrain":
      return key.branch === "main" ? [] : [`terrain/${key.symbol}`];
    case "zap":
      return [`zap/${key.symbol}`];
    case "explosion":
      return [`explosion/${key.symbol}`];
    default:
      return [];
  }
}
