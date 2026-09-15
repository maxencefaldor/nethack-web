import type { MapSnapshot } from "@nethack-web/state";
import type { Tileset } from "./tileset.js";

export interface Cell {
  readonly x: number;
  readonly y: number;
}

/**
 * The camera: where the map's origin sits in the host, in CSS pixels, and
 * how much larger than natural size the tiles are drawn.
 */
export interface MapView {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface RenderOptions {
  /** Draw the engine's background glyph under sprites; text tilesets never layer. */
  readonly terrainBeneath: boolean;
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
  render(map: MapSnapshot, tileset: Tileset, view: MapView, options: RenderOptions): void;
  /** The cell under a point in host-element coordinates, or null when outside the map. */
  pick(point: { readonly x: number; readonly y: number }): Cell | null;
  dispose(): void;
}
