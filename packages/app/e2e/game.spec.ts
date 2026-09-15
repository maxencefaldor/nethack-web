import { expect, test } from "@playwright/test";
import { GamePage } from "./game.js";

const CLASSIC_NO_TUTORIAL = {
  uiMode: "veteran",
  showCommandPalette: false,
  showInventoryPanel: false,
  offerTutorial: false,
  tilesetId: "typographic",
  rendererId: "canvas",
};

test("a new game reaches the dungeon with the hero on the map", async ({ page }) => {
  const game = new GamePage(page);
  await game.open(CLASSIC_NO_TUTORIAL);
  await game.startNewGame("Tester");
  const snapshot = await game.snapshot();
  expect(snapshot.status.fields.LEVELDESC?.text.trim()).toBe("Dlvl:1");
  expect(snapshot.map.cells.some((cell) => cell?.symbol === "@")).toBe(true);
  await expect(page.locator(".status")).toContainText("Tester");
});

test("help files come from the engine's data library", async ({ page }) => {
  const game = new GamePage(page);
  await game.open(CLASSIC_NO_TUTORIAL);
  await game.startNewGame("Tester");
  await game.press("?");
  await game.waitFor("selectMenu");
  await game.press("c");
  const request = await game.waitFor("displayFile");
  expect(request.text).toContain("Move commands");
  await game.press("Escape");
  await game.waitFor("getKeyOrPosition");
});

test("saving and continuing restores the same character", async ({ page }) => {
  const game = new GamePage(page);
  await game.open(CLASSIC_NO_TUTORIAL);
  await game.startNewGame("Tester");
  const before = await game.snapshot();
  await game.press("S");
  await game.waitFor("yesNo");
  await game.press("y");
  await game.waitFor("displayWindowBlocking");
  await game.press("Space");
  await page.waitForFunction(
    () =>
      (
        globalThis as unknown as { __nethackDebug: { snapshot(): { phase: string } } }
      ).__nethackDebug.snapshot().phase === "exited",
  );
  await page.goto("/");
  await page.click("text=Tester");
  await game.waitFor("getKeyOrPosition");
  const after = await game.snapshot();
  expect(after.messages.map((message) => message.text)).toContain("Restoring save file...");
  expect(after.status.fields.TITLE?.text).toBe(before.status.fields.TITLE?.text);
});

test("the codex serves the engine's own encyclopedia text", async ({ page }) => {
  const game = new GamePage(page);
  await game.open(CLASSIC_NO_TUTORIAL);
  await page.click("text=Codex");
  await page.getByRole("searchbox", { name: "Search the codex" }).fill("floating eye");
  await page.getByRole("button", { name: /floating eye/ }).click();
  await expect(page.locator(".codex-title")).toHaveText("floating eye");
  await expect(page.locator(".codex-prose")).toContainText("Floating eyes, not surprisingly");
  await expect(page.locator(".codex-facts")).toContainText("passive");
});

test("a sprite tileset can be chosen and the game keeps drawing", async ({ page }) => {
  const game = new GamePage(page);
  await game.installFixtureTileset();
  await game.open({ ...CLASSIC_NO_TUTORIAL, tilesetId: "placeholder" });
  await game.startNewGame("Tester");
  const drawn = await page.evaluate(() => {
    const canvas = document.querySelector(".map canvas") as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    if (context === null) return 0;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if ((pixels[index] ?? 0) + (pixels[index + 1] ?? 0) + (pixels[index + 2] ?? 0) > 200)
        lit += 1;
    }
    return lit;
  });
  expect(drawn).toBeGreaterThan(100);
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("combobox", { name: "Tileset" })).toHaveText(
    "Characters (pipeline check)",
  );
});

test("the map defaults to the whole grid, zooms with the wheel, and resets", async ({ page }) => {
  const game = new GamePage(page);
  await game.installFixtureTileset();
  await game.open({ ...CLASSIC_NO_TUTORIAL, tilesetId: "placeholder" });
  await game.startNewGame("Tester");
  const geometry = () =>
    page.evaluate(() => {
      const host = document.querySelector(".map") as HTMLElement;
      const canvas = host.querySelector("canvas") as HTMLCanvasElement;
      const bounds = canvas.getBoundingClientRect();
      const hostBounds = host.getBoundingClientRect();
      return {
        width: bounds.width,
        fits: bounds.left >= hostBounds.left && bounds.right <= hostBounds.right,
      };
    });
  const initial = await geometry();
  expect(initial.fits).toBe(true);
  await page.locator(".map").hover();
  await page.mouse.wheel(0, -600);
  await expect.poll(async () => (await geometry()).width).toBeGreaterThan(initial.width * 1.5);
  await page.getByRole("button", { name: "Reset view" }).click();
  await expect.poll(async () => (await geometry()).width).toBeCloseTo(initial.width, 0);
});

test("Guided play draws NetHack's own tiles by default", async ({ page }) => {
  const game = new GamePage(page);
  await game.open({ uiMode: "newcomer", offerTutorial: false, tilesetId: "official" });
  await game.startNewGame("Tester");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("combobox", { name: "Tileset" })).toHaveText("NetHack tiles");
});

test("a left click on a tile opens the codex at that tile", async ({ page }) => {
  const game = new GamePage(page);
  await game.open(CLASSIC_NO_TUTORIAL);
  await game.startNewGame("Tester");
  // Follow centres the hero in the map, clear of the floating panels.
  await page.getByRole("button", { name: "Follow the hero" }).click();
  await page.waitForTimeout(300);
  const host = await page.locator(".map").boundingBox();
  if (host === null) throw new Error("map not found");
  await page.mouse.click(host.x + host.width / 2, host.y + host.height / 2);
  await expect(page.locator(".codex-page .codex-kind")).toHaveText("Creature");
});

test("quitting shows the engine's own end-of-game report", async ({ page }) => {
  const game = new GamePage(page);
  await game.open(CLASSIC_NO_TUTORIAL);
  await game.startNewGame("Tester");
  await game.press("#");
  await game.waitFor("getExtendedCommand");
  await page.keyboard.type("quit");
  await game.press("Enter");
  await game.waitFor("yesNo");
  await game.press("y");
  // Decline the possessions and attributes questions, dismiss the tombstone.
  for (let index = 0; index < 10; index += 1) {
    const request = await game.pending();
    if (request?.type === "yesNo") await game.press("n");
    else if (request?.type === "displayWindowBlocking") await game.press("Space");
    else if (request?.type === "selectMenu") await game.press("Escape");
    else if (request?.type === "getKey") await game.press("Space");
    await page.waitForTimeout(200);
  }
  await expect(page.locator(".end-report")).toContainText("Tester", { timeout: 15_000 });
});
