import { describe, expect, it } from "vitest";
import { centerOn, fitCamera, MAX_CELL_HEIGHT, panBy, zoomAt, zoomLimits } from "./camera.js";

const host = { width: 1000, height: 600 };
const natural = { width: 880, height: 462 };
const cell = { width: 11, height: 22 };

describe("camera", () => {
  it("fits the whole map centred with a margin", () => {
    const camera = fitCamera(host, natural);
    expect(camera.scale).toBeCloseTo(976 / 880);
    expect(camera.offsetX).toBeCloseTo(12);
    expect(camera.offsetY).toBeCloseTo((600 - 462 * camera.scale) / 2);
  });

  it("zooms around the anchor so the point under it does not move", () => {
    const camera = fitCamera(host, natural);
    const anchor = { x: 300, y: 200 };
    const mapPointBefore = (anchor.x - camera.offsetX) / camera.scale;
    const zoomed = zoomAt(camera, 2, anchor, zoomLimits(camera.scale, cell.height));
    const mapPointAfter = (anchor.x - zoomed.offsetX) / zoomed.scale;
    expect(zoomed.scale).toBeCloseTo(camera.scale * 2);
    expect(mapPointAfter).toBeCloseTo(mapPointBefore);
  });

  it("zooms out to half the whole-map scale and in until a cell is MAX_CELL_HEIGHT tall", () => {
    const camera = fitCamera(host, natural);
    const limits = zoomLimits(camera.scale, cell.height);
    expect(zoomAt(camera, 100, { x: 0, y: 0 }, limits).scale * cell.height).toBeCloseTo(
      MAX_CELL_HEIGHT,
    );
    expect(zoomAt(camera, 0.01, { x: 0, y: 0 }, limits).scale).toBeCloseTo(camera.scale * 0.5);
  });

  it("never caps zoom below the whole-map scale on a very large screen", () => {
    const camera = fitCamera({ width: 8000, height: 5000 }, natural);
    expect(camera.scale * cell.height).toBeGreaterThan(MAX_CELL_HEIGHT);
    expect(zoomLimits(camera.scale, cell.height).max).toBe(camera.scale);
  });

  it("pans and centres on a cell without changing the scale", () => {
    const camera = panBy(fitCamera(host, natural), 10, -5);
    const centred = centerOn(camera, { x: 40, y: 10 }, { width: 11, height: 22 }, host);
    expect(centred.scale).toBe(camera.scale);
    expect(centred.offsetX + 40.5 * 11 * camera.scale).toBeCloseTo(500);
    expect(centred.offsetY + 10.5 * 22 * camera.scale).toBeCloseTo(300);
  });

  it("frames the whole map inside the area the HUD leaves free", () => {
    const insets = { top: 80, right: 300, bottom: 60, left: 0 };
    const camera = fitCamera(host, natural, insets);
    const right = camera.offsetX + natural.width * camera.scale;
    const bottom = camera.offsetY + natural.height * camera.scale;
    expect(camera.offsetY).toBeGreaterThanOrEqual(80);
    expect(bottom).toBeLessThanOrEqual(600 - 60);
    expect(right).toBeLessThanOrEqual(1000 - 300);
    const centred = centerOn(camera, { x: 0, y: 0 }, { width: 11, height: 22 }, host, insets);
    expect(centred.offsetX + 5.5 * camera.scale).toBeCloseTo(350);
    expect(centred.offsetY + 11 * camera.scale).toBeCloseTo(80 + (600 - 140) / 2);
  });
});
