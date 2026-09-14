import type { GlyphInfo } from "./glyph.js";
import type { ColorIndex, TextAttributes } from "./window.js";

/** How many entries a menu lets the player choose. Mirrors PICK_NONE / PICK_ONE / PICK_ANY. */
export type MenuSelectionMode = "none" | "one" | "any";

/**
 * A line the engine added to a menu.
 *
 * `identifier` is an opaque token: the 32-bit word of the engine's `anything`
 * union, handed back untouched when the line is selected. Null marks a heading
 * or separator that cannot be selected.
 */
export interface MenuEntry {
  readonly identifier: number | null;
  readonly accelerator: string;
  readonly groupAccelerator: string;
  readonly attributes: TextAttributes;
  readonly color: ColorIndex;
  readonly text: string;
  readonly glyph: GlyphInfo | null;
  readonly preselected: boolean;
}

/** One chosen line, with the count the player typed (null meaning "all"). */
export interface MenuSelection {
  readonly identifier: number;
  readonly count: number | null;
}
