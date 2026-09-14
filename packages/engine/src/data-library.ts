/**
 * Reader for the engine's data library ("nhdat"), the archive that holds its
 * help files, level descriptions and encyclopedia at runtime.
 *
 * Format, from src/dlb.c: a header line "revision entries stringSize
 * dataOffset totalSize", one line per entry "<handling><name> <offset>", then
 * the concatenated file contents starting at dataOffset. Each entry ends
 * where the next begins.
 */
export interface DataLibraryEntry {
  readonly name: string;
  readonly offset: number;
  readonly size: number;
}

export class DataLibrary {
  private readonly entries = new Map<string, DataLibraryEntry>();

  constructor(private readonly bytes: Uint8Array) {
    this.index();
  }

  static empty(): DataLibrary {
    return new DataLibrary(new Uint8Array());
  }

  names(): readonly string[] {
    return [...this.entries.keys()];
  }

  /** The file's text, or null when the library has no such entry. */
  read(name: string): string | null {
    const entry = this.entries.get(name);
    if (entry === undefined) return null;
    return new TextDecoder().decode(this.bytes.subarray(entry.offset, entry.offset + entry.size));
  }

  private index(): void {
    if (this.bytes.length === 0) return;
    const decoder = new TextDecoder();
    let cursor = 0;
    const nextLine = (): string => {
      const end = this.bytes.indexOf(0x0a, cursor);
      const line = decoder.decode(this.bytes.subarray(cursor, end < 0 ? this.bytes.length : end));
      cursor = end < 0 ? this.bytes.length : end + 1;
      return line;
    };
    const header = nextLine().trim().split(/\s+/).map(Number);
    const [, count, , dataOffset, totalSize] = header;
    if (count === undefined || dataOffset === undefined || totalSize === undefined) return;
    const raw: { name: string; offset: number }[] = [];
    for (let index = 0; index < count; index += 1) {
      const match = /^(.)(\S+)\s+(\d+)\s*$/.exec(nextLine());
      if (match === null) continue;
      raw.push({ name: match[2] ?? "", offset: Number(match[3]) });
    }
    raw.forEach((entry, index) => {
      const next = raw[index + 1];
      const end = next === undefined ? totalSize : next.offset;
      this.entries.set(entry.name, {
        name: entry.name,
        offset: entry.offset,
        size: end - entry.offset,
      });
    });
  }
}
