import type { EntityRef } from "@nethack-web/codex";
import { useCodex, useGame } from "../context.js";
import { MenuEntries } from "./MenuEntries.js";

/** The engine's permanent inventory, kept current by the engine itself; each line opens its codex page. */
export function InventoryPanel({ onInspect }: { onInspect: (ref: EntityRef) => void }) {
  const game = useGame();
  const codex = useCodex();
  const inventory = Object.values(game.windows).find((window) => window.menu?.permanentInventory);
  const menu = inventory?.menu ?? null;
  const inspect = (index: number) => {
    const glyph = menu?.entries[index]?.glyph;
    const entity = glyph ? codex.entityForGlyph(glyph.glyph) : null;
    if (entity !== null) onInspect(entity);
  };
  return (
    <aside className="inventory" aria-label="Inventory">
      <h2 className="panel-title">Inventory</h2>
      {menu === null || menu.entries.length === 0 ? (
        <p className="panel-empty">Nothing carried.</p>
      ) : (
        <MenuEntries menu={menu} onPick={inspect} />
      )}
    </aside>
  );
}
