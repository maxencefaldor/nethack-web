import type { GlyphInfo } from "./glyph.js";
import type { MenuEntry } from "./menu.js";
import type { StatusField, StatusHighlight } from "./status.js";
import type { ColorIndex, TextAttributes, WindowId, WindowKind } from "./window.js";

/**
 * Notifications from the engine that need no answer.
 *
 * Each variant corresponds to one windowport call. Names follow the engine's
 * verbs so the mapping stays obvious when reading doc/window.txt.
 */
export type EngineEvent =
  | { readonly type: "initWindows" }
  | { readonly type: "exitWindows"; readonly message: string | null }
  | { readonly type: "suspendWindows"; readonly message: string | null }
  | { readonly type: "resumeWindows" }
  | { readonly type: "createWindow"; readonly window: WindowId; readonly kind: WindowKind }
  | { readonly type: "clearWindow"; readonly window: WindowId }
  | { readonly type: "displayWindow"; readonly window: WindowId }
  | { readonly type: "destroyWindow"; readonly window: WindowId }
  | {
      readonly type: "moveCursor";
      readonly window: WindowId;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: "putString";
      readonly window: WindowId;
      readonly attributes: TextAttributes;
      readonly text: string;
    }
  | { readonly type: "startMenu"; readonly window: WindowId; readonly permanentInventory: boolean }
  | { readonly type: "addMenuEntry"; readonly window: WindowId; readonly entry: MenuEntry }
  | { readonly type: "endMenu"; readonly window: WindowId; readonly prompt: string | null }
  | { readonly type: "clipAround"; readonly x: number; readonly y: number }
  | { readonly type: "updatePositionBar"; readonly features: string }
  | {
      readonly type: "printGlyph";
      readonly window: WindowId;
      readonly x: number;
      readonly y: number;
      readonly glyph: GlyphInfo;
      readonly background: GlyphInfo | null;
    }
  | { readonly type: "rawPrint"; readonly text: string; readonly bold: boolean }
  | { readonly type: "bell" }
  | { readonly type: "numberPad"; readonly state: number }
  | { readonly type: "preferenceUpdate"; readonly preference: string }
  | { readonly type: "putMessageHistory"; readonly text: string; readonly restoring: boolean }
  | { readonly type: "statusInit" }
  | {
      readonly type: "statusEnableField";
      readonly field: StatusField;
      readonly name: string;
      readonly format: string;
      readonly enabled: boolean;
    }
  | {
      readonly type: "statusUpdate";
      readonly field: StatusField;
      readonly text: string;
      /** Glyph the engine wants shown before the text, as for the gold field. */
      readonly glyph: number | null;
      readonly change: number;
      readonly percent: number;
      readonly highlight: StatusHighlight;
    }
  | {
      readonly type: "statusConditions";
      readonly conditions: number;
      readonly colorMasks: readonly number[];
    }
  | { readonly type: "statusFlush" }
  | { readonly type: "statusReset" }
  | { readonly type: "updateInventory" };

export type EngineEventType = EngineEvent["type"];

/** Convenience for drawing code that only wants map cells. */
export interface CellUpdate {
  readonly x: number;
  readonly y: number;
  readonly glyph: GlyphInfo;
  readonly color: ColorIndex;
}
