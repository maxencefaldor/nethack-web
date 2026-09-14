import type { CatalogEntry } from "./catalog.ts";
import type { StyleSpecification } from "./style.ts";

/** The prompt for one tile: style prefix, the subject, kind-specific notes, style suffix. */
export function promptFor(style: StyleSpecification, entry: CatalogEntry): string {
  const kindNote = style.prompt.perKind[entry.kind] ?? "";
  const subject =
    entry.kind === "terrain"
      ? `${entry.name}, a dungeon feature`
      : `${entry.name} (${entry.description})`;
  return [style.prompt.prefix, subject, kindNote, style.prompt.suffix]
    .filter((part) => part.trim() !== "")
    .join(". ");
}

/** A reproducible seed per tile so re-running a style regenerates identical candidates. */
export function seedFor(style: StyleSpecification, entry: CatalogEntry): number {
  let hash = style.seed >>> 0;
  for (const char of entry.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0 || 1;
  return hash;
}
