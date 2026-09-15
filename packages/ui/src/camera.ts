import type { MapView } from "@nethack-web/renderer";

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** How far the camera may zoom relative to the scale that fits the whole map. */
export const ZOOM_LIMITS = { min: 0.5, max: 12 } as const;

/** Space kept clear around the whole-map view so the HUD does not sit on its edge. */
const FIT_PADDING = 12;

/** The camera showing the whole map centred: the terminal's own framing. */
export function fitCamera(host: Size, natural: Size): MapView {
  const scale = Math.min(
    (host.width - FIT_PADDING * 2) / natural.width,
    (host.height - FIT_PADDING * 2) / natural.height,
  );
  const safe = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return {
    scale: safe,
    offsetX: (host.width - natural.width * safe) / 2,
    offsetY: (host.height - natural.height * safe) / 2,
  };
}

export function panBy(camera: MapView, dx: number, dy: number): MapView {
  return { ...camera, offsetX: camera.offsetX + dx, offsetY: camera.offsetY + dy };
}

/** Scales around a point in host coordinates so the map under the pointer stays put. */
export function zoomAt(camera: MapView, factor: number, anchor: Point, fit: number): MapView {
  const scale = Math.min(
    fit * ZOOM_LIMITS.max,
    Math.max(fit * ZOOM_LIMITS.min, camera.scale * factor),
  );
  const ratio = scale / camera.scale;
  return {
    scale,
    offsetX: anchor.x - (anchor.x - camera.offsetX) * ratio,
    offsetY: anchor.y - (anchor.y - camera.offsetY) * ratio,
  };
}

/** Moves the camera so a cell sits in the middle of the host, keeping the scale. */
export function centerOn(camera: MapView, cell: Point, cellSize: Size, host: Size): MapView {
  return {
    ...camera,
    offsetX: host.width / 2 - (cell.x + 0.5) * cellSize.width * camera.scale,
    offsetY: host.height / 2 - (cell.y + 0.5) * cellSize.height * camera.scale,
  };
}

/** Distance between two points, for pinch gestures. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
