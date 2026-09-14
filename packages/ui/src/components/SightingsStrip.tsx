import type { EntityRef } from "@nethack-web/codex";
import { useMemo, useRef } from "react";
import { useCodex, useGame } from "../context.js";

/** Creatures visible right now that the player has not met yet this game, linked to the codex. */
export function SightingsStrip({ onOpen }: { onOpen: (ref: EntityRef) => void }) {
  const game = useGame();
  const codex = useCodex();
  const met = useRef(new Set<number>());

  const fresh = useMemo(() => {
    const visible = new Map<number, string>();
    for (const cell of game.map.cells) {
      if (cell === null) continue;
      const key = codex.glyphs.classify(cell.glyph);
      if (key === null || key.kind !== "monster" || key.variant === "statue") continue;
      if ((cell.flags & 1) !== 0) continue;
      const monster = codex.monster(key.index);
      if (monster !== null && !met.current.has(key.index)) {
        visible.set(key.index, codex.page({ kind: "monster", index: key.index })?.title ?? "");
      }
    }
    return [...visible.entries()];
  }, [game.map.cells, codex]);

  if (fresh.length === 0) return null;
  return (
    <nav className="sightings" aria-label="New creatures in view">
      {fresh.map(([index, title]) => (
        <button
          key={index}
          type="button"
          className="sighting"
          onClick={() => {
            met.current.add(index);
            onOpen({ kind: "monster", index });
          }}
        >
          New: {title}
        </button>
      ))}
    </nav>
  );
}
