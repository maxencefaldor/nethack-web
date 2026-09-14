import type { GlyphInfo } from "@nethack-web/protocol";
import { MAP_COLUMNS, MAP_ROWS, type MapSnapshot } from "@nethack-web/state";
import type { Cell, MapRenderer, MapView } from "./map-renderer.js";
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
  private host: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  /** Natural cell size of the current tileset, in CSS pixels at scale 1. */
  private cellWidth = 0;
  private cellHeight = 0;
  /** Scale from natural cell size to displayed size. */
  private scale = 1;

  constructor(private readonly style: CanvasMapRendererStyle = DEFAULT_CANVAS_STYLE) {}

  mount(host: HTMLElement): void {
    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    host.querySelector("canvas")?.remove();
    host.prepend(canvas);
    this.host = host;
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
  }

  render(map: MapSnapshot, tileset: Tileset, view: MapView): void {
    const { canvas, context, host } = this;
    if (canvas === null || context === null || host === null) return;
    this.cellWidth = tileset.cellSize.width;
    this.cellHeight = tileset.cellSize.height;
    this.scale = this.scaleFor(view, host);
    const ratio = window.devicePixelRatio || 1;
    const displayWidth = MAP_COLUMNS * this.cellWidth * this.scale;
    const displayHeight = MAP_ROWS * this.cellHeight * this.scale;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.width = Math.round(displayWidth * ratio);
    canvas.height = Math.round(displayHeight * ratio);

    context.setTransform(ratio * this.scale, 0, 0, ratio * this.scale, 0, 0);
    // Pixel art keeps hard pixels when enlarged; anything shrunk is filtered.
    context.imageSmoothingEnabled = !(tileset.pixelArt && this.scale >= 1);
    context.imageSmoothingQuality = "high";
    context.fillStyle = this.style.background;
    context.fillRect(0, 0, MAP_COLUMNS * this.cellWidth, MAP_ROWS * this.cellHeight);
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (let y = 0; y < MAP_ROWS; y += 1) {
      for (let x = 0; x < MAP_COLUMNS; x += 1) {
        const glyph = map.cells[y * MAP_COLUMNS + x];
        if (glyph === null || glyph === undefined) continue;
        this.drawCell(context, x, y, glyph, tileset.resolve(glyph));
      }
    }
    if (view.mode === "follow" && view.focus !== null) this.scrollTo(host, view.focus);
  }

  /** Whole: the largest scale at which the full grid fits the host. Follow: the chosen zoom. */
  private scaleFor(view: MapView, host: HTMLElement): number {
    if (view.mode === "follow") return view.zoom;
    const padding = 12;
    const availableWidth = Math.max(1, host.clientWidth - padding);
    const availableHeight = Math.max(1, host.clientHeight - padding);
    return Math.min(
      availableWidth / (MAP_COLUMNS * this.cellWidth),
      availableHeight / (MAP_ROWS * this.cellHeight),
    );
  }

  private scrollTo(host: HTMLElement, focus: Cell): void {
    const targetX = (focus.x + 0.5) * this.cellWidth * this.scale - host.clientWidth / 2;
    const targetY = (focus.y + 0.5) * this.cellHeight * this.scale - host.clientHeight / 2;
    host.scrollTo({ left: Math.max(0, targetX), top: Math.max(0, targetY) });
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
      context.drawImage(
        drawable.image,
        drawable.sourceX,
        drawable.sourceY,
        drawable.sourceWidth,
        drawable.sourceHeight,
        left,
        top,
        this.cellWidth,
        this.cellHeight,
      );
      return;
    }
    context.font = drawable.font;
    context.fillStyle = drawable.color;
    context.fillText(drawable.text, centerX, centerY + 1);
  }

  pick(point: { readonly x: number; readonly y: number }): Cell | null {
    if (this.canvas === null || this.cellWidth === 0) return null;
    const x = Math.floor(point.x / (this.cellWidth * this.scale));
    const y = Math.floor(point.y / (this.cellHeight * this.scale));
    if (x < 0 || y < 0 || x >= MAP_COLUMNS || y >= MAP_ROWS) return null;
    return { x, y };
  }

  dispose(): void {
    this.canvas?.remove();
    this.canvas = null;
    this.context = null;
    this.host = null;
  }
}
