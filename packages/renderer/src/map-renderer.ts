import type { MapSnapshot } from "@nethack-web/state";
import type { Tileset } from "./tileset.js";

export interface Cell {
  readonly x: number;
  readonly y: number;
}

/**
 * How the map is framed. "whole" shows the entire grid scaled into the host,
 * which is what the terminal shows; "follow" draws tiles at `zoom` times their
 * natural size and scrolls to keep `focus` in view.
 */
export type MapViewMode = "whole" | "follow";

export interface MapView {
  readonly mode: MapViewMode;
  /** Scale applied to natural tile size in follow mode; 1 is one tile pixel per CSS pixel. */
  readonly zoom: number;
  /** Cell to keep in view in follow mode, if known. */
  readonly focus: Cell | null;
}

/**
 * Draws a map snapshot with a tileset into a host element.
 *
 * Renderers differ in technique (canvas, WebGPU, three.js), not in contract:
 * given the same snapshot and tileset they show the same cells, and they can
 * all answer which cell lies under a pointer.
 */
export interface MapRenderer {
  readonly id: string;
  mount(host: HTMLElement): void;
  render(map: MapSnapshot, tileset: Tileset, view: MapView): void;
  /** The cell under a point in host-element coordinates, or null when outside the map. */
  pick(point: { readonly x: number; readonly y: number }): Cell | null;
  dispose(): void;
}
