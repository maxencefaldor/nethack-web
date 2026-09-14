import { useGame } from "../context.js";
import { MenuEntries } from "./MenuEntries.js";

/** The engine's permanent inventory, kept current by the engine itself. */
export function InventoryPanel() {
  const game = useGame();
  const inventory = Object.values(game.windows).find((window) => window.menu?.permanentInventory);
  const menu = inventory?.menu ?? null;
  return (
    <aside className="inventory" aria-label="Inventory">
      <h2 className="panel-title">Inventory</h2>
      {menu === null || menu.entries.length === 0 ? (
        <p className="panel-empty">Nothing carried.</p>
      ) : (
        <MenuEntries menu={menu} />
      )}
    </aside>
  );
}
