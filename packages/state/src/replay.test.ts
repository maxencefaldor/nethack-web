import type { EngineEvent, EngineRequest } from "@nethack-web/protocol";
import { describe, expect, it } from "vitest";
import transcript from "./fixtures/wizard-dlvl2.json" with { type: "json" };
import { reduceAll, withCatalog, withRequest } from "./reduce.js";
import { EMPTY_SNAPSHOT, type GameSnapshot, windowOfKind } from "./snapshot.js";

type Entry =
  | { kind: "catalog"; catalog: GameSnapshot["catalog"] }
  | { kind: "events"; events: EngineEvent[] }
  | { kind: "request"; request: EngineRequest }
  | { kind: "reply"; reply: unknown }
  | { kind: "exit"; code: number };

/** Replays a recorded engine session through the reducer, as the host would. */
function replay(entries: Entry[]): GameSnapshot {
  let snapshot = EMPTY_SNAPSHOT;
  for (const entry of entries) {
    switch (entry.kind) {
      case "catalog":
        if (entry.catalog) snapshot = withCatalog(snapshot, entry.catalog);
        break;
      case "events":
        snapshot = reduceAll(snapshot, entry.events);
        break;
      case "request":
        snapshot = withRequest(snapshot, entry.request);
        break;
      case "reply":
        snapshot = withRequest(snapshot, null);
        break;
      case "exit":
        break;
    }
  }
  return snapshot;
}

describe("replaying a recorded wizard-mode session", () => {
  const snapshot = replay(transcript.entries as Entry[]);

  it("knows the engine and its extended commands", () => {
    expect(snapshot.catalog?.version).toBe("NetHack-5.0.0_Release");
    expect(snapshot.catalog?.extendedCommands.some((command) => command.name === "quit")).toBe(
      true,
    );
  });

  it("has message and map windows plus the permanent inventory menu", () => {
    expect(windowOfKind(snapshot, "message")).not.toBeNull();
    expect(windowOfKind(snapshot, "map")).not.toBeNull();
    const inventory = Object.values(snapshot.windows).find(
      (window) => window.menu?.permanentInventory,
    );
    expect(inventory?.kind).toBe("menu");
  });

  it("ends on dungeon level 2 with the hero on the map", () => {
    expect(snapshot.status.fields.LEVELDESC?.text.trim()).toBe("Dlvl:2");
    const hero = snapshot.map.cells.find((cell) => cell !== null && (cell.flags & 1) !== 0);
    expect(hero?.symbol).toBe("@");
  });

  it("keeps the message log in order with turn stamps", () => {
    const texts = snapshot.messages.map((message) => message.text);
    expect(texts).toContain("You materialize on a different level!");
    expect(texts.at(-1)).toBe("Saving...");
    expect(snapshot.messages.at(-1)?.turn).toBe(2);
  });

  it("is waiting on the final --More-- of the save", () => {
    expect(snapshot.request?.type).toBe("displayWindowBlocking");
  });
});
