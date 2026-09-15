import type { EngineEvent, GlyphInfo } from "@nethack-web/protocol";
import { describe, expect, it } from "vitest";
import { reduce, reduceAll, withRequest } from "./reduce.js";
import { cellIndex, EMPTY_SNAPSHOT, PLAIN_TEXT_ATTRIBUTES, windowOfKind } from "./snapshot.js";

const glyph = (symbol: string, color = 7): GlyphInfo => ({
  glyph: 1,
  symbol,
  color,
  symbolIndex: 0,
  flags: 0,
  frameColor: 0,
  tileIndex: -1,
});

const boot: EngineEvent[] = [
  { type: "initWindows" },
  { type: "createWindow", window: 1, kind: "message" },
  { type: "createWindow", window: 2, kind: "status" },
  { type: "createWindow", window: 3, kind: "map" },
];

describe("reduce", () => {
  it("creates windows and enters play", () => {
    const snapshot = reduceAll(EMPTY_SNAPSHOT, boot);
    expect(snapshot.phase).toBe("playing");
    expect(windowOfKind(snapshot, "map")?.id).toBe(3);
  });

  it("writes glyphs into map cells and clears them with the map window", () => {
    let snapshot = reduceAll(EMPTY_SNAPSHOT, boot);
    snapshot = reduce(snapshot, {
      type: "printGlyph",
      window: 3,
      x: 10,
      y: 4,
      glyph: glyph("@"),
      background: null,
    });
    expect(snapshot.map.cells[cellIndex(10, 4)]?.symbol).toBe("@");
    snapshot = reduce(snapshot, { type: "clearWindow", window: 3 });
    expect(snapshot.map.cells[cellIndex(10, 4)]).toBeNull();
  });

  it("routes message window text into the message log", () => {
    let snapshot = reduceAll(EMPTY_SNAPSHOT, boot);
    snapshot = reduce(snapshot, {
      type: "putString",
      window: 1,
      attributes: PLAIN_TEXT_ATTRIBUTES,
      text: "Hello, welcome to NetHack!",
    });
    expect(snapshot.messages.map((message) => message.text)).toEqual([
      "Hello, welcome to NetHack!",
    ]);
    expect(windowOfKind(snapshot, "message")?.lines).toEqual([]);
  });

  it("assigns accelerators to selectable menu entries the engine left blank", () => {
    let snapshot = reduceAll(EMPTY_SNAPSHOT, [
      ...boot,
      { type: "createWindow", window: 4, kind: "menu" },
      { type: "startMenu", window: 4, permanentInventory: false },
    ]);
    const entry = (identifier: number | null, accelerator: string, text: string): EngineEvent => ({
      type: "addMenuEntry",
      window: 4,
      entry: {
        identifier,
        accelerator,
        groupAccelerator: "\0",
        attributes: PLAIN_TEXT_ATTRIBUTES,
        color: 8,
        text,
        glyph: null,
        preselected: false,
      },
    });
    snapshot = reduceAll(snapshot, [
      entry(null, "\0", "Weapons"),
      entry(1, "\0", "a long sword"),
      entry(2, "q", "quit"),
      entry(3, "\0", "a dagger"),
    ]);
    expect(snapshot.windows[4]?.menu?.accelerators).toEqual([" ", "a", "q", "b"]);
  });

  it("keeps status fields and tags messages with the turn", () => {
    let snapshot = reduceAll(EMPTY_SNAPSHOT, boot);
    snapshot = reduce(snapshot, {
      type: "statusUpdate",
      field: "TIME",
      text: "42",
      glyph: null,
      change: 0,
      percent: 0,
      highlight: { color: 8, attribute: 0 },
    });
    snapshot = reduce(snapshot, {
      type: "putString",
      window: 1,
      attributes: PLAIN_TEXT_ATTRIBUTES,
      text: "You hear a door open.",
    });
    expect(snapshot.messages[0]?.turn).toBe(42);
  });

  it("returns the same snapshot when the request is unchanged", () => {
    const snapshot = withRequest(EMPTY_SNAPSHOT, null);
    expect(snapshot).toBe(EMPTY_SNAPSHOT);
  });

  it("replays message history the engine restores from a save", () => {
    let snapshot = reduceAll(EMPTY_SNAPSHOT, boot);
    snapshot = reduce(snapshot, {
      type: "putMessageHistory",
      text: "You see here a rock.",
      restoring: true,
    });
    snapshot = reduce(snapshot, { type: "putMessageHistory", text: "ignored", restoring: false });
    expect(snapshot.messages.map((message) => message.text)).toEqual(["You see here a rock."]);
  });

  it("keeps the terrain the engine reports beneath a glyph", () => {
    let snapshot = reduceAll(EMPTY_SNAPSHOT, boot);
    snapshot = reduce(snapshot, {
      type: "printGlyph",
      window: 3,
      x: 2,
      y: 2,
      glyph: glyph("d"),
      background: glyph("."),
    });
    expect(snapshot.map.backgrounds[cellIndex(2, 2)]?.symbol).toBe(".");
    snapshot = reduce(snapshot, { type: "clearWindow", window: 3 });
    expect(snapshot.map.backgrounds[cellIndex(2, 2)]).toBeNull();
  });
});
