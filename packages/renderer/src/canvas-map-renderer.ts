import type { GlyphInfo } from "@nethack-web/protocol";
import { MAP_COLUMNS, MAP_ROWS, type MapSnapshot } from "@nethack-web/state";
import type { Cell, MapRenderer, MapView, RenderOptions } from "./map-renderer.js";
import type { Drawable, Tileset } from "./tileset.js";

export interface CanvasMapRendererStyle {
  readonly background: string;
  readonly heroGlow: string;
  readonly petTint: string;
  readonly pileMark: string;
}

export const DEFAULT_CANVAS_STYLE: CanvasMapRendererStyle = {
  background: "#0f1113",
  heroGlow: "rgba(255, 244, 214, 0.16)",
  petTint: "rgba(111, 191, 149, 0.22)",
  pileMark: "rgba(245, 218, 106, 0.9)",
};

/**
 * A 2D canvas renderer. The whole grid is redrawn on every snapshot, which at
 * 80 by 21 cells costs about a millisecond and keeps the code free of dirty
 * tracking.
 *
 * The canvas backing store always matches the displayed size in device
 * pixels, so text and sprites are rasterised once at their final size rather
 * than drawn large and shrunk by the browser.
 */
export class CanvasMapRenderer implements MapRenderer {
  readonly id = "canvas";
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  /** Natural cell size of the current tileset, in CSS pixels at scale 1. */
  private cellWidth = 0;
  private cellHeight = 0;
  private view: MapView = { scale: 1, offsetX: 0, offsetY: 0 };

  constructor(private readonly style: CanvasMapRendererStyle = DEFAULT_CANVAS_STYLE) {}

  mount(host: HTMLElement): void {
    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.transformOrigin = "0 0";
    host.querySelector("canvas")?.remove();
    host.prepend(canvas);
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
  }

  render(map: MapSnapshot, tileset: Tileset, view: MapView, options: RenderOptions): void {
    const { canvas, context } = this;
    if (canvas === null || context === null) return;
    this.cellWidth = tileset.cellSize.width;
    this.cellHeight = tileset.cellSize.height;
    this.view = view;
    const ratio = window.devicePixelRatio || 1;
    const displayWidth = MAP_COLUMNS * this.cellWidth * view.scale;
    const displayHeight = MAP_ROWS * this.cellHeight * view.scale;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.style.transform = `translate(${view.offsetX}px, ${view.offsetY}px)`;
    canvas.width = Math.round(displayWidth * ratio);
    canvas.height = Math.round(displayHeight * ratio);

    context.setTransform(ratio * view.scale, 0, 0, ratio * view.scale, 0, 0);
    // Pixel art keeps hard pixels when enlarged; anything shrunk is filtered.
    context.imageSmoothingEnabled = !(tileset.pixelArt && view.scale >= 1);
    context.imageSmoothingQuality = "high";
    context.fillStyle = this.style.background;
    context.fillRect(0, 0, MAP_COLUMNS * this.cellWidth, MAP_ROWS * this.cellHeight);
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (let y = 0; y < MAP_ROWS; y += 1) {
      for (let x = 0; x < MAP_COLUMNS; x += 1) {
        const glyph = map.cells[y * MAP_COLUMNS + x];
        if (glyph === null || glyph === undefined) continue;
        if (options.terrainBeneath) {
          const background = map.backgrounds[y * MAP_COLUMNS + x];
          const beneath = background ? tileset.resolve(background) : tileset.beneath(glyph);
          if (beneath?.kind === "sprite") this.drawSprite(context, x, y, beneath);
        }
        this.drawCell(context, x, y, glyph, tileset.resolve(glyph));
      }
    }
  }

  private drawCell(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    _glyph: GlyphInfo,
    drawable: Drawable,
  ): void {
    const left = x * this.cellWidth;
    const top = y * this.cellHeight;
    const centerX = left + this.cellWidth / 2;
    const centerY = top + this.cellHeight / 2;
    if (drawable.emphasis.pet) {
      context.fillStyle = this.style.petTint;
      context.fillRect(left, top, this.cellWidth, this.cellHeight);
    }
    if (drawable.emphasis.hero) {
      const radius = Math.max(this.cellWidth, this.cellHeight) * 1.5;
      const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      glow.addColorStop(0, this.style.heroGlow);
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = glow;
      context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    }
    if (drawable.emphasis.pile) {
      const size = Math.max(1.5, this.cellWidth / 6);
      context.fillStyle = this.style.pileMark;
      context.fillRect(left + this.cellWidth - size - 1, top + 1, size, size);
    }
    if (drawable.kind === "sprite") {
      this.drawSprite(context, x, y, drawable);
      return;
    }
    context.font = drawable.font;
    context.fillStyle = drawable.color;
    context.fillText(drawable.text, centerX, centerY + 1);
  }

  private drawSprite(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    drawable: Extract<Drawable, { kind: "sprite" }>,
  ): void {
    context.drawImage(
      drawable.image,
      drawable.sourceX,
      drawable.sourceY,
      drawable.sourceWidth,
      drawable.sourceHeight,
      x * this.cellWidth,
      y * this.cellHeight,
      this.cellWidth,
      this.cellHeight,
    );
  }

  pick(point: { readonly x: number; readonly y: number }): Cell | null {
    if (this.canvas === null || this.cellWidth === 0) return null;
    const { scale, offsetX, offsetY } = this.view;
    const x = Math.floor((point.x - offsetX) / (this.cellWidth * scale));
    const y = Math.floor((point.y - offsetY) / (this.cellHeight * scale));
    if (x < 0 || y < 0 || x >= MAP_COLUMNS || y >= MAP_ROWS) return null;
    return { x, y };
  }

  dispose(): void {
    this.canvas?.remove();
    this.canvas = null;
    this.context = null;
  }
}
