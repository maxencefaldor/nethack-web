import type { MenuSelection, MenuSelectionMode } from "@nethack-web/protocol";
import type { MenuSnapshot } from "@nethack-web/state";
import { useEffect, useState } from "react";
import { useSession } from "../context.js";
import { engineKeyCode, KEY_ENTER, KEY_ESCAPE, KEY_SPACE } from "../keys.js";
import { MenuEntries } from "./MenuEntries.js";
import { Modal } from "./Modal.js";

export interface MenuDialogProps {
  readonly menu: MenuSnapshot;
  readonly mode: MenuSelectionMode;
}

/**
 * An engine menu awaiting selection. Keys follow the terminal interface:
 * accelerators pick, digits type a count, `,` and `-` select and clear all,
 * Enter confirms, Escape cancels, and any key dismisses a read-only menu.
 */
export function MenuDialog({ menu, mode }: MenuDialogProps) {
  const session = useSession();
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(menu.entries.flatMap((entry, index) => (entry.preselected ? [index] : []))),
  );
  const [counts, setCounts] = useState<Map<number, number>>(new Map());
  const [count, setCount] = useState<number | null>(null);

  const finish = (selections: readonly MenuSelection[]) =>
    session.answer("selectMenu", { selections });
  const cancel = () => session.answer("selectMenu", { cancelled: true });
  const confirm = () =>
    finish(
      [...selected].map((index) => ({
        identifier: menu.entries[index]?.identifier ?? 0,
        count: counts.get(index) ?? null,
      })),
    );

  const pick = (index: number) => {
    const identifier = menu.entries[index]?.identifier;
    if (identifier === null || identifier === undefined) return;
    if (mode === "one") {
      finish([{ identifier, count }]);
      return;
    }
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(index) && count === null) next.delete(index);
      else next.add(index);
      return next;
    });
    setCounts((previous) => {
      const next = new Map(previous);
      if (count === null) next.delete(index);
      else next.set(index, count);
      return next;
    });
    setCount(null);
  };

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const key = engineKeyCode(event, false);
      if (key === null) return;
      event.preventDefault();
      if (mode === "none") {
        finish([]);
        return;
      }
      if (key === KEY_ESCAPE) return cancel();
      if (key === KEY_ENTER || key === KEY_SPACE) return confirm();
      const character = String.fromCharCode(key);
      if (mode === "any" && /[0-9]/.test(character)) {
        setCount((previous) => (previous ?? 0) * 10 + Number(character));
        return;
      }
      if (mode === "any" && character === ",") {
        setSelected(
          new Set(
            menu.entries.flatMap((entry, index) => (entry.identifier === null ? [] : [index])),
          ),
        );
        return;
      }
      if (mode === "any" && character === "-") {
        setSelected(new Set());
        setCounts(new Map());
        return;
      }
      const index = menu.accelerators.indexOf(character);
      if (index >= 0) pick(index);
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  });

  const actions = (
    <>
      {count !== null ? <span className="menu-count">Count: {count}</span> : null}
      {mode === "none" ? (
        <button type="button" onClick={() => finish([])}>
          Close
        </button>
      ) : (
        <>
          <button type="button" onClick={cancel}>
            Cancel
          </button>
          {mode === "any" ? (
            <button type="button" className="primary" onClick={confirm}>
              Done
            </button>
          ) : null}
        </>
      )}
    </>
  );

  return (
    <Modal
      title={menu.prompt ?? "Menu"}
      hideTitle={menu.prompt === null}
      className="menu-dialog"
      actions={actions}
    >
      <MenuEntries
        menu={menu}
        selected={selected}
        counts={counts}
        onPick={mode === "none" ? undefined : pick}
      />
    </Modal>
  );
}
