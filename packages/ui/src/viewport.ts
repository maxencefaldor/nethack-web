import type { MapView, Tileset } from "@nethack-web/renderer";
import { MAP_COLUMNS, MAP_ROWS } from "@nethack-web/state";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  centerOn,
  distance,
  fitCamera,
  freeArea,
  type Insets,
  midpoint,
  type Point,
  panBy,
  zoomAt,
  zoomLimits,
} from "./camera.js";

/** Wheel notches per doubling; a trackpad pinch reports finer deltas and zooms smoothly. */
const WHEEL_ZOOM_RATE = 0.0025;
const KEY_ZOOM_STEP = 1.25;
/** Pointer movement under this many pixels counts as a tap rather than a drag. */
const TAP_SLOP = 4;

export interface MapViewport {
  readonly camera: MapView;
  /** True while a pointer is moving the map. */
  readonly dragging: boolean;
  readonly following: boolean;
  readonly setFollowing: (on: boolean) => void;
  readonly reset: () => void;
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  /** Recentres on a cell, used by follow mode after each turn. */
  readonly centerOnCell: (cell: Point) => void;
  /** Pointer handlers for the host element; taps are reported back separately. */
  readonly handlers: {
    readonly onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    readonly onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
    readonly onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
    readonly onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  };
}

interface Pointer {
  readonly id: number;
  readonly start: Point;
  last: Point;
  moved: boolean;
}

/**
 * Camera state and gestures for the map host: drag to pan, wheel or pinch to
 * zoom around the pointer, Ctrl or Cmd with plus, minus and zero on the
 * keyboard. Follow keeps the hero centred until the player drags.
 */
export function useMapViewport(
  hostRef: RefObject<HTMLElement | null>,
  tileset: Tileset,
  insets: Insets,
  onTap: (point: Point, event: { readonly button: number }) => void,
): MapViewport {
  const natural = {
    width: MAP_COLUMNS * tileset.cellSize.width,
    height: MAP_ROWS * tileset.cellSize.height,
  };
  const [camera, setCamera] = useState<MapView>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [following, setFollowing] = useState(false);
  const [dragging, setDragging] = useState(false);
  // "whole" follows layout changes (HUD, window, tileset); "custom" is the
  // player's own camera and stays put until Reset.
  const [framing, setFraming] = useState<"whole" | "custom">("whole");
  const pointers = useRef(new Map<number, Pointer>());
  const pinch = useRef<number | null>(null);

  const hostSize = useCallback(() => {
    const host = hostRef.current;
    return { width: host?.clientWidth ?? 0, height: host?.clientHeight ?? 0 };
  }, [hostRef]);
  const fitScale = useCallback(
    () => fitCamera(hostSize(), natural, insets).scale,
    [hostSize, natural.width, natural.height, insets],
  );

  const reset = useCallback(() => {
    setFollowing(false);
    setFraming("whole");
    setCamera(fitCamera(hostSize(), natural, insets));
  }, [hostSize, natural.width, natural.height, insets]);

  // While the framing is "whole", any change of host size, HUD insets or
  // tileset refits the map. A custom camera is left alone.
  useEffect(() => {
    const host = hostRef.current;
    if (host === null || framing !== "whole") return;
    const fit = () => {
      if (host.clientWidth > 0) setCamera(fitCamera(hostSize(), natural, insets));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => observer.disconnect();
  }, [hostRef, natural.width, natural.height, hostSize, insets, framing]);

  // Zooming scales around the pointer, except while following the hero,
  // when it scales around the middle of the free area so the hero stays put.
  const zoomBy = useCallback(
    (factor: number, anchor?: Point) => {
      const area = freeArea(hostSize(), insets);
      const middle = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
      setFraming("custom");
      const limits = zoomLimits(fitScale(), tileset.cellSize.height);
      setCamera((current) =>
        zoomAt(current, factor, following ? middle : (anchor ?? middle), limits),
      );
    },
    [hostSize, insets, fitScale, tileset.cellSize.height, following],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const bounds = host.getBoundingClientRect();
      const delta =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY;
      zoomBy(Math.exp(-delta * WHEEL_ZOOM_RATE), {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    };
    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, [hostRef, zoomBy]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key;
      if (key === "=" || key === "+") zoomBy(KEY_ZOOM_STEP);
      else if (key === "-") zoomBy(1 / KEY_ZOOM_STEP);
      else if (key === "0") reset();
      else return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("keydown", onKey, { capture: true });
    return () => document.removeEventListener("keydown", onKey, { capture: true });
  }, [zoomBy, reset]);

  const local = (event: React.PointerEvent<HTMLElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const handlers: MapViewport["handlers"] = {
    onPointerDown: (event) => {
      if (event.button !== 0 && event.button !== 2) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const point = local(event);
      pointers.current.set(event.pointerId, {
        id: event.pointerId,
        start: point,
        last: point,
        moved: false,
      });
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        if (a && b) pinch.current = distance(a.last, b.last);
      }
    },
    onPointerMove: (event) => {
      const pointer = pointers.current.get(event.pointerId);
      if (pointer === undefined) return;
      const point = local(event);
      const dx = point.x - pointer.last.x;
      const dy = point.y - pointer.last.y;
      pointer.last = point;
      if (!pointer.moved && distance(point, pointer.start) > TAP_SLOP) {
        pointer.moved = true;
        setDragging(true);
      }
      if (!pointer.moved) return;
      setFollowing(false);
      setFraming("custom");
      if (pointers.current.size === 2 && pinch.current !== null) {
        const [a, b] = [...pointers.current.values()];
        if (a && b) {
          const now = distance(a.last, b.last);
          zoomBy(now / pinch.current, midpoint(a.last, b.last));
          pinch.current = now;
        }
        return;
      }
      setCamera((current) => panBy(current, dx, dy));
    },
    onPointerUp: (event) => {
      const pointer = pointers.current.get(event.pointerId);
      pointers.current.delete(event.pointerId);
      pinch.current = null;
      if (pointers.current.size === 0) setDragging(false);
      if (pointer !== undefined && !pointer.moved) {
        onTap(pointer.start, { button: event.button });
      }
    },
    onPointerCancel: (event) => {
      pointers.current.delete(event.pointerId);
      pinch.current = null;
      if (pointers.current.size === 0) setDragging(false);
    },
  };

  const centerOnCell = useCallback(
    (cell: Point) => {
      setFraming("custom");
      setCamera((current) => centerOn(current, cell, tileset.cellSize, hostSize(), insets));
    },
    [hostSize, tileset.cellSize, insets],
  );

  return {
    camera,
    dragging,
    following,
    setFollowing,
    reset,
    zoomIn: () => zoomBy(KEY_ZOOM_STEP),
    zoomOut: () => zoomBy(1 / KEY_ZOOM_STEP),
    centerOnCell,
    handlers,
  };
}
