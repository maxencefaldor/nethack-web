import { createCanvas, loadImage } from "@napi-rs/canvas";

/** Fits a generated image into the cell, quantising to the palette when one is given. */
export async function normalize(
  png: Uint8Array,
  size: number,
  palette: readonly string[],
): Promise<Uint8Array> {
  const image = await loadImage(Buffer.from(png));
  const canvas = createCanvas(size, size);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.drawImage(image, 0, 0, size, size);
  if (palette.length > 0) {
    const pixels = context.getImageData(0, 0, size, size);
    const colors = palette.map(parseHex);
    for (let offset = 0; offset < pixels.data.length; offset += 4) {
      if ((pixels.data[offset + 3] ?? 0) < 8) continue;
      const nearest = nearestColor(
        colors,
        pixels.data[offset] ?? 0,
        pixels.data[offset + 1] ?? 0,
        pixels.data[offset + 2] ?? 0,
      );
      pixels.data[offset] = nearest[0];
      pixels.data[offset + 1] = nearest[1];
      pixels.data[offset + 2] = nearest[2];
    }
    context.putImageData(pixels, 0, 0);
  }
  return new Uint8Array(canvas.toBuffer("image/png"));
}

type Rgb = readonly [number, number, number];

function parseHex(hex: string): Rgb {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function nearestColor(colors: readonly Rgb[], r: number, g: number, b: number): Rgb {
  let best: Rgb = colors[0] ?? [r, g, b];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const color of colors) {
    const distance = (color[0] - r) ** 2 + (color[1] - g) ** 2 + (color[2] - b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = color;
    }
  }
  return best;
}
