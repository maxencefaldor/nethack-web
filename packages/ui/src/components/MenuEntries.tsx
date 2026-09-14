import type { MenuSnapshot } from "@nethack-web/state";

export interface MenuEntriesProps {
  readonly menu: MenuSnapshot;
  readonly selected?: ReadonlySet<number> | undefined;
  readonly counts?: ReadonlyMap<number, number> | undefined;
  readonly onPick?: ((index: number) => void) | undefined;
}

/** Renders a menu's lines: headings as plain rows, selectable lines with their accelerators. */
export function MenuEntries({ menu, selected, counts, onPick }: MenuEntriesProps) {
  return (
    <ol className="menu-entries">
      {menu.entries.map((entry, index) => {
        const selectable = entry.identifier !== null;
        if (!selectable) {
          return (
            <li
              key={`${index}-${entry.text}`}
              className={`menu-heading menu-${entry.attributes.style}`}
            >
              {entry.text}
            </li>
          );
        }
        const isSelected = selected?.has(index) ?? false;
        const count = counts?.get(index);
        return (
          <li key={`${index}-${entry.text}`}>
            <button
              type="button"
              className={`menu-entry${isSelected ? " menu-entry-selected" : ""}`}
              onClick={onPick === undefined ? undefined : () => onPick(index)}
              disabled={onPick === undefined}
            >
              <kbd className="menu-accelerator">{menu.accelerators[index]}</kbd>
              <span className="menu-mark" aria-hidden="true">
                {isSelected ? (count === undefined ? "+" : count) : "-"}
              </span>
              <span className="menu-text">{entry.text}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
