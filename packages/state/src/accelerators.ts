import type { MenuEntry } from "@nethack-web/protocol";

const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NONE = "\0";

/**
 * Accelerators for a menu: the engine's own where it gave one, otherwise the
 * next unused letter, as the tty interface does. Headings get a space.
 */
export function assignAccelerators(entries: readonly MenuEntry[]): string[] {
  const taken = new Set(entries.map((entry) => entry.accelerator));
  let next = 0;
  return entries.map((entry) => {
    if (entry.identifier === null) return " ";
    if (entry.accelerator !== NONE) return entry.accelerator;
    while (next < LETTERS.length && taken.has(LETTERS[next] ?? "")) next += 1;
    const letter = LETTERS[next] ?? "?";
    next += 1;
    return letter;
  });
}
