/**
 * Encyclopedia text, byte for byte as the engine ships it.
 *
 * Lookup follows the engine's own rules from dat/data.base: keys are
 * lowercase and may use `?` and `*`; a key beginning with `~` excludes what
 * it matches from the keys that follow it in the same entry.
 */
export interface DescriptionEntry {
  readonly keys: readonly string[];
  readonly text: string;
}

export interface Description {
  /** The lines exactly as stored, including the leading tab on each. */
  readonly text: string;
  /** Where the text came from, so the interface can label it. */
  readonly source: "official" | "custom";
}

export interface DescriptionSource {
  describe(name: string): Description | null;
}

/** The engine's pattern matcher: `?` one character, `*` any run, case-insensitive. */
export function patternMatches(pattern: string, text: string): boolean {
  const regex = new RegExp(
    `^${pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".")}$`,
    "i",
  );
  return regex.test(text);
}

export class OfficialDescriptions implements DescriptionSource {
  private readonly exact = new Map<string, DescriptionEntry>();

  constructor(private readonly entries: readonly DescriptionEntry[]) {
    for (const entry of entries) {
      for (const key of entry.keys) {
        if (!/[*?~]/.test(key) && !this.exact.has(key)) this.exact.set(key, entry);
      }
    }
  }

  describe(name: string): Description | null {
    const needle = name.toLowerCase();
    const direct = this.exact.get(needle);
    if (direct !== undefined) return { text: direct.text, source: "official" };
    for (const entry of this.entries) {
      let excluded = false;
      for (const key of entry.keys) {
        if (key.startsWith("~")) {
          if (patternMatches(key.slice(1), needle)) excluded = true;
        } else if (!excluded && patternMatches(key, needle)) {
          return { text: entry.text, source: "official" };
        }
      }
    }
    return null;
  }
}

/** Custom prose keyed by lowercase name; never edits the official text, only adds to or replaces it per name. */
export class CustomDescriptions implements DescriptionSource {
  constructor(private readonly texts: ReadonlyMap<string, string>) {}

  describe(name: string): Description | null {
    const text = this.texts.get(name.toLowerCase());
    return text === undefined ? null : { text, source: "custom" };
  }
}

/** Asks each source in turn; the first answer wins. */
export function layered(...sources: readonly DescriptionSource[]): DescriptionSource {
  return {
    describe(name) {
      for (const source of sources) {
        const description = source.describe(name);
        if (description !== null) return description;
      }
      return null;
    },
  };
}
