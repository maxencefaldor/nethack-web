import { describe, expect, it } from "vitest";
import { centerOn, fitCamera, panBy, zoomAt } from "./camera.js";

const host = { width: 1000, height: 600 };
const natural = { width: 880, height: 462 };

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
    const zoomed = zoomAt(camera, 2, anchor, camera.scale);
    const mapPointAfter = (anchor.x - zoomed.offsetX) / zoomed.scale;
    expect(zoomed.scale).toBeCloseTo(camera.scale * 2);
    expect(mapPointAfter).toBeCloseTo(mapPointBefore);
  });

  it("clamps zoom to the limits relative to the fitted scale", () => {
    const camera = fitCamera(host, natural);
    expect(zoomAt(camera, 100, { x: 0, y: 0 }, camera.scale).scale).toBeCloseTo(camera.scale * 12);
    expect(zoomAt(camera, 0.01, { x: 0, y: 0 }, camera.scale).scale).toBeCloseTo(
      camera.scale * 0.5,
    );
  });

  it("pans and centres on a cell without changing the scale", () => {
    const camera = panBy(fitCamera(host, natural), 10, -5);
    const centred = centerOn(camera, { x: 40, y: 10 }, { width: 11, height: 22 }, host);
    expect(centred.scale).toBe(camera.scale);
    expect(centred.offsetX + 40.5 * 11 * camera.scale).toBeCloseTo(500);
    expect(centred.offsetY + 10.5 * 22 * camera.scale).toBeCloseTo(300);
  });
});
