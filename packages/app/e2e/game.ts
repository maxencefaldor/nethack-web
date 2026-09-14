import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EngineRequest, EngineRequestType } from "@nethack-web/protocol";
import type { GameSnapshot } from "@nethack-web/state";
import type { Page } from "@playwright/test";
import { FIXTURE_TILESET } from "./global-setup.js";

/** Drives the app through the debug hook the dev build exposes. */
export class GamePage {
  constructor(private readonly page: Page) {}

  async open(preferences?: Record<string, unknown>): Promise<void> {
    if (preferences) {
      await this.page.addInitScript(
        (value) => localStorage.setItem("nethack-web.preferences", value),
        JSON.stringify(preferences),
      );
    }
    await this.page.goto("/");
  }

  /** Serves the test-built sprite tileset as if it were installed, without shipping it. */
  async installFixtureTileset(): Promise<void> {
    const manifest = readFileSync(resolve(FIXTURE_TILESET, "manifest.json"), "utf8");
    const id = (JSON.parse(manifest) as { id: string }).id;
    await this.page.route("**/tilesets/index.json", (route) =>
      route.fulfill({ json: { tilesets: [id] } }),
    );
    await this.page.route(`**/tilesets/${id}/manifest.json`, (route) =>
      route.fulfill({ body: manifest, contentType: "application/json" }),
    );
    await this.page.route(`**/tilesets/${id}/atlas.png`, (route) =>
      route.fulfill({ path: resolve(FIXTURE_TILESET, "atlas.png"), contentType: "image/png" }),
    );
  }

  snapshot(): Promise<GameSnapshot> {
    return this.page.evaluate(() =>
      (
        globalThis as unknown as { __nethackDebug: { snapshot(): GameSnapshot } }
      ).__nethackDebug.snapshot(),
    );
  }

  async pending(): Promise<EngineRequest | null> {
    return (await this.snapshot()).request;
  }

  /** Waits until the engine is blocked on the given request type. */
  async waitFor<T extends EngineRequestType>(
    type: T,
  ): Promise<Extract<EngineRequest, { type: T }>> {
    await this.page.waitForFunction(
      (expected) =>
        (
          globalThis as unknown as { __nethackDebug?: { snapshot(): GameSnapshot } }
        ).__nethackDebug?.snapshot().request?.type === expected,
      type,
      { timeout: 30_000 },
    );
    return (await this.pending()) as Extract<EngineRequest, { type: T }>;
  }

  async press(...keys: string[]): Promise<void> {
    for (const key of keys) await this.page.keyboard.press(key);
  }

  /** Starts a new game with a random character and plays until the map is waiting for a command. */
  async startNewGame(name: string): Promise<void> {
    await this.page.fill("#player-name", name);
    await this.page.click("text=New game");
    await this.waitFor("yesNo");
    await this.press("y");
    await this.waitFor("selectMenu");
    await this.press("y");
    await this.waitFor("displayWindowBlocking");
    await this.press("Space");
    await this.waitFor("getKeyOrPosition");
  }
}
