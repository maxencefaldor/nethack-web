/**
 * Bottom-line status fields, named as in the engine's botl.h without the BL_ prefix.
 * The bridge decodes the numeric field index through the vocabulary.
 */
export type StatusField =
  | "TITLE"
  | "STR"
  | "DX"
  | "CO"
  | "IN"
  | "WI"
  | "CH"
  | "ALIGN"
  | "SCORE"
  | "CAP"
  | "GOLD"
  | "ENE"
  | "ENEMAX"
  | "XP"
  | "AC"
  | "HD"
  | "TIME"
  | "HUNGER"
  | "HP"
  | "HPMAX"
  | "LEVELDESC"
  | "EXP"
  | "CONDITION"
  | "VERS";

/** Colour and attribute the engine wants a status field drawn with. */
export interface StatusHighlight {
  readonly color: number;
  readonly attribute: number;
}
