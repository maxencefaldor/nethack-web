import { type RefObject, useEffect, useState } from "react";
import { type Insets, NO_INSETS } from "./camera.js";

/** Gap kept between the HUD panels and the map. */
const GAP = 8;

export interface HudRefs {
  readonly top: RefObject<HTMLElement | null>;
  readonly bottom: RefObject<HTMLElement | null>;
  readonly right: RefObject<HTMLElement | null>;
}

/**
 * Measures the space the HUD panels take along the top, bottom and right of
 * the screen so the map can be framed in what remains. Re-measures whenever
 * a panel resizes, appears or disappears.
 */
export function useHudInsets(screen: RefObject<HTMLElement | null>, refs: HudRefs): Insets {
  const [insets, setInsets] = useState<Insets>(NO_INSETS);
  useEffect(() => {
    const container = screen.current;
    if (container === null) return;
    const measure = () => {
      const bounds = container.getBoundingClientRect();
      const extent = (element: HTMLElement | null, side: "top" | "bottom" | "right") => {
        if (element === null) return 0;
        const box = element.getBoundingClientRect();
        if (side === "top") return Math.max(0, box.bottom - bounds.top);
        if (side === "bottom") return Math.max(0, bounds.bottom - box.top);
        return Math.max(0, bounds.right - box.left);
      };
      const next: Insets = {
        top: extent(refs.top.current, "top") + GAP,
        bottom: extent(refs.bottom.current, "bottom") + GAP,
        right: refs.right.current ? extent(refs.right.current, "right") + GAP : 0,
        left: 0,
      };
      setInsets((current) =>
        current.top === next.top && current.bottom === next.bottom && current.right === next.right
          ? current
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    for (const ref of [refs.top, refs.bottom, refs.right]) {
      if (ref.current) observer.observe(ref.current);
    }
    return () => observer.disconnect();
  });
  return insets;
}
