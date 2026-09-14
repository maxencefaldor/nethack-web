import type { EngineCatalog, EngineEvent, EngineRequest, WindowId } from "@nethack-web/protocol";
import { assignAccelerators } from "./accelerators.js";
import {
  cellIndex,
  type GameSnapshot,
  MAP_COLUMNS,
  MAP_ROWS,
  type MenuSnapshot,
  PLAIN_TEXT_ATTRIBUTES,
  type WindowSnapshot,
} from "./snapshot.js";

/**
 * Pure transitions of the game snapshot.
 *
 * `reduce` applies one engine event. The other functions apply the
 * lifecycle facts the host learns outside the event stream.
 */

function withWindow(
  snapshot: GameSnapshot,
  id: WindowId,
  update: (window: WindowSnapshot) => WindowSnapshot,
): GameSnapshot {
  const window = snapshot.windows[id];
  if (window === undefined) return snapshot;
  return { ...snapshot, windows: { ...snapshot.windows, [id]: update(window) } };
}

function withMenu(
  snapshot: GameSnapshot,
  id: WindowId,
  update: (menu: MenuSnapshot) => MenuSnapshot,
): GameSnapshot {
  return withWindow(snapshot, id, (window) =>
    window.menu === null ? window : { ...window, menu: update(window.menu) },
  );
}

function currentTurn(snapshot: GameSnapshot): number | null {
  const time = snapshot.status.fields.TIME?.text;
  if (time === undefined) return null;
  const turn = Number.parseInt(time, 10);
  return Number.isNaN(turn) ? null : turn;
}

export function reduce(snapshot: GameSnapshot, event: EngineEvent): GameSnapshot {
  switch (event.type) {
    case "initWindows":
      return { ...snapshot, phase: "playing" };

    case "exitWindows":
      return snapshot;

    case "suspendWindows":
    case "resumeWindows":
      return snapshot;

    case "createWindow":
      return {
        ...snapshot,
        windows: {
          ...snapshot.windows,
          [event.window]: {
            id: event.window,
            kind: event.kind,
            lines: [],
            menu: null,
            shown: false,
          },
        },
      };

    case "clearWindow": {
      const window = snapshot.windows[event.window];
      if (window?.kind === "map") {
        return {
          ...snapshot,
          map: { ...snapshot.map, cells: Array(MAP_COLUMNS * MAP_ROWS).fill(null) },
        };
      }
      return withWindow(snapshot, event.window, (existing) => ({
        ...existing,
        lines: [],
        shown: false,
      }));
    }

    case "displayWindow":
      return withWindow(snapshot, event.window, (window) => ({ ...window, shown: true }));

    case "destroyWindow": {
      const { [event.window]: _removed, ...windows } = snapshot.windows;
      return { ...snapshot, windows };
    }

    case "moveCursor": {
      const window = snapshot.windows[event.window];
      if (window?.kind !== "map") return snapshot;
      return { ...snapshot, map: { ...snapshot.map, cursor: { x: event.x, y: event.y } } };
    }

    case "putString": {
      const window = snapshot.windows[event.window];
      if (window === undefined || window.kind === "message") {
        return appendMessage(snapshot, event.text, event.attributes);
      }
      return withWindow(snapshot, event.window, (existing) => ({
        ...existing,
        lines: [...existing.lines, { text: event.text, attributes: event.attributes }],
      }));
    }

    case "rawPrint":
      return appendMessage(snapshot, event.text, {
        style: event.bold ? "bold" : "none",
        urgent: false,
        noHistory: false,
      });

    case "startMenu":
      return withWindow(snapshot, event.window, (window) => ({
        ...window,
        lines: [],
        menu: {
          entries: [],
          accelerators: [],
          prompt: null,
          permanentInventory: event.permanentInventory,
        },
      }));

    case "addMenuEntry":
      return withMenu(snapshot, event.window, (menu) => {
        const entries = [...menu.entries, event.entry];
        return { ...menu, entries, accelerators: assignAccelerators(entries) };
      });

    case "endMenu":
      return withMenu(snapshot, event.window, (menu) => ({ ...menu, prompt: event.prompt }));

    case "printGlyph": {
      if (event.x < 0 || event.x >= MAP_COLUMNS || event.y < 0 || event.y >= MAP_ROWS) {
        return snapshot;
      }
      const cells = snapshot.map.cells.slice();
      cells[cellIndex(event.x, event.y)] = event.glyph;
      return { ...snapshot, map: { ...snapshot.map, cells } };
    }

    case "clipAround":
      return { ...snapshot, map: { ...snapshot.map, focus: { x: event.x, y: event.y } } };

    case "numberPad":
      return { ...snapshot, numberPad: event.state !== 0 };

    case "statusInit":
      return { ...snapshot, status: { ...snapshot.status, fields: {}, enabled: {} } };

    case "statusEnableField":
      return {
        ...snapshot,
        status: {
          ...snapshot.status,
          enabled: { ...snapshot.status.enabled, [event.field]: event.enabled },
        },
      };

    case "statusUpdate":
      return {
        ...snapshot,
        status: {
          ...snapshot.status,
          fields: {
            ...snapshot.status.fields,
            [event.field]: {
              text: event.text,
              glyph: event.glyph,
              highlight: event.highlight,
              change: event.change,
              percent: event.percent,
            },
          },
        },
      };

    case "statusConditions":
      return {
        ...snapshot,
        status: {
          ...snapshot.status,
          conditions: event.conditions,
          conditionColorMasks: event.colorMasks,
        },
      };

    case "putMessageHistory":
      // The engine replays the messages it saved with the game while restoring.
      return event.restoring
        ? appendMessage(snapshot, event.text, PLAIN_TEXT_ATTRIBUTES)
        : snapshot;

    case "statusFlush":
    case "statusReset":
    case "updatePositionBar":
    case "bell":
    case "preferenceUpdate":
    case "updateInventory":
      return snapshot;
  }
}

function appendMessage(
  snapshot: GameSnapshot,
  text: string,
  attributes: GameSnapshot["messages"][number]["attributes"],
): GameSnapshot {
  const last = snapshot.messages.at(-1);
  const message = { id: (last?.id ?? 0) + 1, text, attributes, turn: currentTurn(snapshot) };
  return { ...snapshot, messages: [...snapshot.messages, message] };
}

export function reduceAll(snapshot: GameSnapshot, events: readonly EngineEvent[]): GameSnapshot {
  let next = snapshot;
  for (const event of events) next = reduce(next, event);
  return next;
}

export function withCatalog(snapshot: GameSnapshot, catalog: EngineCatalog): GameSnapshot {
  return { ...snapshot, catalog };
}

export function withRequest(snapshot: GameSnapshot, request: EngineRequest | null): GameSnapshot {
  return snapshot.request === request ? snapshot : { ...snapshot, request };
}

export function withExit(snapshot: GameSnapshot, code: number): GameSnapshot {
  return { ...snapshot, phase: "exited", exitCode: code, request: null };
}
