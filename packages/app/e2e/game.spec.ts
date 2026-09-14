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
  await page.fill(".codex-search", "floating eye");
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
  await page.click("text=Settings");
  const tilesetSelect = page
    .locator("select")
    .filter({ has: page.locator('option[value="placeholder"]') });
  await expect(tilesetSelect).toHaveValue("placeholder");
});

test("the map defaults to the terminal's whole-grid framing whatever the tileset", async ({
  page,
}) => {
  const game = new GamePage(page);
  await game.installFixtureTileset();
  await game.open({ ...CLASSIC_NO_TUTORIAL, tilesetId: "placeholder" });
  await game.startNewGame("Tester");
  const framing = await page.evaluate(() => {
    const host = document.querySelector(".map") as HTMLElement;
    const canvas = host.querySelector("canvas") as HTMLCanvasElement;
    const bounds = canvas.getBoundingClientRect();
    return {
      canvasWidth: bounds.width,
      hostWidth: host.clientWidth,
      scrollable: host.scrollWidth > host.clientWidth,
    };
  });
  expect(framing.scrollable).toBe(false);
  expect(framing.canvasWidth).toBeLessThanOrEqual(framing.hostWidth);
  await page.click("text=Follow");
  await expect(page.locator(".map-view button").first()).toHaveText("Whole map");

  await expect
    .poll(() =>
      page.evaluate(() => {
        const host = document.querySelector(".map") as HTMLElement;
        return host.scrollWidth > host.clientWidth;
      }),
    )
    .toBe(true);
});

test("Guided play draws NetHack's own tiles by default", async ({ page }) => {
  const game = new GamePage(page);
  await game.open({ uiMode: "newcomer", offerTutorial: false, tilesetId: "official" });
  await game.startNewGame("Tester");
  await page.click("text=Settings");
  const tilesetSelect = page.locator("select").filter({ has: page.locator('option[value="official"]') });
  await expect(tilesetSelect).toHaveValue("official");
  await expect(tilesetSelect.locator("option[value='official']")).toHaveText("NetHack tiles");
});
