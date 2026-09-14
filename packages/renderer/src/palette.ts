/**
 * The sixteen terminal colours the engine speaks in, indexed as CLR_* in
 * color.h, plus index 8 which the engine uses for "no colour".
 */
export type Palette = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

export const NO_COLOR = 8;

/** A palette tuned for a dark ground: legible, restrained, distinct. */
export const DUSK_PALETTE: Palette = [
  "#4a5058", // black, kept visible for dark room floors
  "#e0665c", // red
  "#62b072", // green
  "#c2924f", // brown
  "#6a95f0", // blue
  "#c77fdc", // magenta
  "#5cbfcf", // cyan
  "#aeb6bf", // gray
  "#dfe5ea", // no colour: the default foreground
  "#f39a4a", // orange
  "#8ce29a", // bright green
  "#f5da6a", // yellow
  "#98bfff", // bright blue
  "#eaa8f5", // bright magenta
  "#8ce8f3", // bright cyan
  "#ffffff", // white
];

export function colorFromPalette(palette: Palette, index: number): string {
  return palette[index] ?? palette[NO_COLOR];
}
