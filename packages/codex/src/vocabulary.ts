/** Named engine constants for presenting entity fields, extracted with the tables. */
export interface VocabularyEntry {
  readonly scope: string;
  readonly name: string;
  readonly value: number;
}

const LABELS: Readonly<Record<string, string>> = {
  AT_NONE: "passive",
  AT_CLAW: "claw",
  AT_BITE: "bite",
  AT_KICK: "kick",
  AT_BUTT: "butt",
  AT_TUCH: "touch",
  AT_STNG: "sting",
  AT_HUGS: "hug",
  AT_SPIT: "spit",
  AT_ENGL: "engulf",
  AT_BREA: "breath",
  AT_EXPL: "explode",
  AT_BOOM: "explode when killed",
  AT_GAZE: "gaze",
  AT_TENT: "tentacles",
  AT_WEAP: "weapon",
  AT_MAGC: "spell",
  AD_PHYS: "physical",
  AD_MAGM: "magic missile",
  AD_FIRE: "fire",
  AD_COLD: "cold",
  AD_SLEE: "sleep",
  AD_DISN: "disintegration",
  AD_ELEC: "shock",
  AD_DRST: "poison (strength)",
  AD_ACID: "acid",
  AD_BLND: "blinding",
  AD_STUN: "stun",
  AD_SLOW: "slow",
  AD_PLYS: "paralysis",
  AD_DRLI: "level drain",
  AD_DREN: "energy drain",
  AD_LEGS: "wounded legs",
  AD_STON: "petrification",
  AD_STCK: "sticky",
  AD_SGLD: "steal gold",
  AD_SITM: "steal item",
  AD_SEDU: "seduce",
  AD_TLPT: "teleport",
  AD_RUST: "rust",
  AD_CONF: "confusion",
  AD_DGST: "digest",
  AD_HEAL: "heal",
  AD_WRAP: "wrap",
  AD_WERE: "lycanthropy",
  AD_DRDX: "poison (dexterity)",
  AD_DRCO: "poison (constitution)",
  AD_DRIN: "eat brains",
  AD_DISE: "disease",
  AD_DCAY: "decay",
  AD_SSEX: "seduce",
  AD_HALU: "hallucination",
  AD_DETH: "death",
  AD_PEST: "pestilence",
  AD_FAMN: "famine",
  AD_SLIM: "sliming",
  AD_ENCH: "disenchant",
  AD_CORR: "corrosion",
  AD_POLY: "polymorph",
  AD_CLRC: "clerical spell",
  AD_SPEL: "arcane spell",
  AD_RBRE: "random breath",
  AD_SAMU: "steal the Amulet",
  AD_CURS: "curse items",
  A_CHAOTIC: "chaotic",
  A_NEUTRAL: "neutral",
  A_LAWFUL: "lawful",
  A_NONE: "unaligned",
  MZ_TINY: "tiny",
  MZ_SMALL: "small",
  MZ_MEDIUM: "medium",
  MZ_LARGE: "large",
  MZ_HUGE: "huge",
  MZ_GIGANTIC: "gigantic",
  MR_FIRE: "fire",
  MR_COLD: "cold",
  MR_SLEEP: "sleep",
  MR_DISINT: "disintegration",
  MR_ELEC: "shock",
  MR_POISON: "poison",
  MR_ACID: "acid",
  MR_STONE: "petrification",
};

export class EngineVocabulary {
  private readonly byScope = new Map<string, Map<number, string>>();

  constructor(entries: readonly VocabularyEntry[]) {
    for (const entry of entries) {
      let scope = this.byScope.get(entry.scope);
      if (scope === undefined) {
        scope = new Map();
        this.byScope.set(entry.scope, scope);
      }
      if (!scope.has(entry.value)) scope.set(entry.value, entry.name);
    }
  }

  /** A readable label for a value, falling back to the engine's own constant name. */
  label(scope: string, value: number): string {
    const name = this.byScope.get(scope)?.get(value);
    if (name === undefined) return String(value);
    return (
      LABELS[name] ??
      name
        .replace(/^[A-Z]+_/, "")
        .toLowerCase()
        .replace(/_/g, " ")
    );
  }

  /** Labels for every bit set in a mask. */
  flags(scope: string, mask: number): string[] {
    const labels: string[] = [];
    for (const [value, name] of this.byScope.get(scope) ?? []) {
      if (value !== 0 && (mask & value) === value) labels.push(LABELS[name] ?? name);
    }
    return labels;
  }
}
