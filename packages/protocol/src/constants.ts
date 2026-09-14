/**
 * Numeric constants published by the engine at startup.
 *
 * The engine exposes its C constants (window types, status fields, glyph
 * offsets, colours, ...) as name/number tables when it boots. Nothing in the
 * client hardcodes these numbers: every decode goes through this table so the
 * client tracks whichever engine build it is running against.
 */
export type ConstantScope =
  | "WIN_TYPE"
  | "STATUS_FIELD"
  | "ATTR"
  | "CONDITION"
  | "MENU_SELECT"
  | "GLYPH"
  | "COLORS"
  | "COLOR_ATTR"
  | "BL_MASK"
  | "HL"
  | "MG"
  | "COPYRIGHT";

/** One scope: names map to numbers and, for numeric constants, numbers map back to names. */
export type ConstantTable = Readonly<Record<string, number | string>>;

export type EngineConstants = Readonly<Partial<Record<ConstantScope, ConstantTable>>>;

/**
 * Typed access to the engine's constant tables.
 *
 * Lookups are by symbolic name so that call sites read like the C source
 * (`vocabulary.number("WIN_TYPE", "NHW_MAP")`) and fail loudly when a name
 * is missing from the engine build.
 */
export class Vocabulary {
  constructor(private readonly constants: EngineConstants) {}

  number(scope: ConstantScope, name: string): number {
    const value = this.constants[scope]?.[name];
    if (typeof value !== "number") {
      throw new Error(`Engine constant ${scope}.${name} is not available`);
    }
    return value;
  }

  name(scope: ConstantScope, value: number): string | undefined {
    const name = this.constants[scope]?.[value];
    return typeof name === "string" ? name : undefined;
  }

  string(scope: ConstantScope, name: string): string {
    const value = this.constants[scope]?.[name];
    if (typeof value !== "string") {
      throw new Error(`Engine constant ${scope}.${name} is not a string`);
    }
    return value;
  }

  scope(scope: ConstantScope): ConstantTable {
    return this.constants[scope] ?? {};
  }
}
