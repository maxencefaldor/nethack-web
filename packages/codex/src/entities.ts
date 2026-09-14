/**
 * Entity records as extracted from the engine by tools/codex-extract.
 * Field names are ours; values are the engine's, untouched.
 */
export interface Attack {
  readonly type: number;
  readonly damage: number;
  readonly dice: number;
  readonly sides: number;
}

export interface Monster {
  readonly index: number;
  /** Male, female and neutral names; the engine leaves unused ones null. */
  readonly names: readonly (string | null)[];
  readonly symbol: string;
  readonly classIndex: number;
  readonly level: number;
  readonly speed: number;
  readonly armorClass: number;
  readonly magicResistance: number;
  readonly alignment: number;
  readonly generation: number;
  readonly attacks: readonly Attack[];
  readonly corpseWeight: number;
  readonly nutrition: number;
  readonly sound: number;
  readonly size: number;
  readonly resistances: number;
  readonly conveys: number;
  readonly flags1: number;
  readonly flags2: number;
  readonly flags3: number;
  readonly difficulty: number;
  readonly color: number;
}

export interface ObjectKind {
  readonly index: number;
  readonly name: string | null;
  /** Appearance before identification, if the kind has one. */
  readonly description: string | null;
  readonly classIndex: number;
  readonly classSymbol: string;
  readonly className: string;
  readonly probability: number;
  readonly weight: number;
  readonly cost: number;
  readonly delay: number;
  readonly color: number;
  readonly material: number;
  readonly subtype: number;
  readonly property: number;
  readonly direction: number;
  readonly smallDamage: number;
  readonly largeDamage: number;
  readonly bonus1: number;
  readonly bonus2: number;
  readonly nutrition: number;
  readonly magic: boolean;
  readonly charged: boolean;
  readonly unique: boolean;
  readonly nowish: boolean;
  readonly merge: boolean;
  readonly big: boolean;
  readonly tough: boolean;
}

export interface Artifact {
  readonly index: number;
  readonly name: string;
  readonly objectIndex: number;
  readonly specialFlags: number;
  readonly carriedFlags: number;
  readonly monsterType: number;
  readonly attack: Attack;
  readonly defense: Attack;
  readonly carry: Attack;
  readonly invokeProperty: number;
  readonly alignment: number;
  readonly role: number;
  readonly race: number;
  readonly cost: number;
  readonly color: number;
}

export interface TerrainSymbol {
  readonly index: number;
  readonly symbol: string;
  /** Null for the few placeholder entries the engine never shows. */
  readonly description: string | null;
  readonly color: number;
}

export interface ClassSymbol {
  readonly index: number;
  readonly symbol: string;
  readonly name: string;
  readonly description: string;
}

export interface Symbols {
  readonly terrain: readonly TerrainSymbol[];
  readonly monsterClasses: readonly ClassSymbol[];
  readonly objectClasses: readonly ClassSymbol[];
  readonly warnings: readonly TerrainSymbol[];
}

/** A reference to one codex page. */
export type EntityRef =
  | { readonly kind: "monster"; readonly index: number }
  | { readonly kind: "object"; readonly index: number }
  | { readonly kind: "artifact"; readonly index: number }
  | { readonly kind: "terrain"; readonly index: number };

export function sameEntity(a: EntityRef, b: EntityRef): boolean {
  return a.kind === b.kind && a.index === b.index;
}

/** The name the engine uses when gender is not known: the neutral one, else the first given. */
export function monsterName(monster: Monster): string {
  return monster.names[2] ?? monster.names[0] ?? monster.names[1] ?? `monster ${monster.index}`;
}
