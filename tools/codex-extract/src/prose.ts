/**
 * Extracts the engine's encyclopedia (dat/data.base) into JSON without
 * altering a byte of the prose.
 *
 * Format, from the file's own header: lines starting with # are comments; a
 * line not starting with whitespace is a lookup key, and consecutive key lines
 * share the entry that follows; entry text lines start with a tab. Keys may
 * use ? and * wildcards and a leading ~ to exclude a match.
 */
import { readFileSync, writeFileSync } from "node:fs";

export interface DescriptionEntry {
  readonly keys: readonly string[];
  /** The entry's lines exactly as stored, leading tab included. */
  readonly text: string;
}

export function parseDataBase(source: string): DescriptionEntry[] {
  const entries: DescriptionEntry[] = [];
  let keys: string[] = [];
  let lines: string[] = [];
  const flush = () => {
    if (keys.length > 0 && lines.length > 0) entries.push({ keys, text: lines.join("\n") });
    keys = [];
    lines = [];
  };
  for (const line of source.split("\n")) {
    if (line.startsWith("#")) continue;
    if (line.startsWith("\t") || line.startsWith(" ")) {
      lines.push(line);
      continue;
    }
    if (line === "") continue;
    if (lines.length > 0) flush();
    keys.push(line);
  }
  flush();
  return entries;
}

if (process.argv[1]?.endsWith("prose.ts")) {
  const [, , input, output] = process.argv;
  if (input === undefined || output === undefined) {
    console.error("usage: node prose.ts <data.base> <descriptions.json>");
    process.exit(1);
  }
  const entries = parseDataBase(readFileSync(input, "utf8"));
  writeFileSync(output, `${JSON.stringify(entries)}\n`);
  console.log(`wrote ${output} (${entries.length} entries)`);
}
