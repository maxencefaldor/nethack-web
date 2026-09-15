import type { StatusHighlight, Vocabulary } from "@nethack-web/protocol";
import { colorFromPalette, DUSK_PALETTE, NO_COLOR } from "@nethack-web/renderer";
import type { CSSProperties } from "react";

/** HL_* attribute bits, from botl.h. */
export const HL_BOLD = 0x02;
export const HL_DIM = 0x04;
export const HL_ITALIC = 0x08;
export const HL_ULINE = 0x10;
export const HL_INVERSE = 0x40;

/** Colour and attributes the engine asked for, as inline style; NO_COLOR means the default. */
export function highlightStyle(highlight: StatusHighlight | undefined): CSSProperties | undefined {
  if (highlight === undefined) return undefined;
  const style: CSSProperties = {};
  if (highlight.color !== NO_COLOR) style.color = colorFromPalette(DUSK_PALETTE, highlight.color);
  const attribute = highlight.attribute;
  if (attribute & HL_BOLD) style.fontWeight = 600;
  if (attribute & HL_DIM) style.opacity = 0.6;
  if (attribute & HL_ITALIC) style.fontStyle = "italic";
  if (attribute & HL_ULINE) style.textDecoration = "underline";
  if (attribute & HL_INVERSE) {
    style.background = style.color ?? "var(--ink)";
    style.color = "var(--ground)";
  }
  return Object.keys(style).length === 0 ? undefined : style;
}

/** Attribute index order after the colours in the engine's colour-mask array (HL_ATTCLR_*). */
const ATTRIBUTE_BITS = [0, HL_BOLD, HL_DIM, HL_ITALIC, HL_ULINE, 0, HL_INVERSE] as const;

/**
 * Colour the engine assigned to a condition. `masks[i]` holds the condition
 * bits shown in colour i for i below CLR_MAX, and in attribute i - CLR_MAX - 1
 * above it, in the HL_ATTCLR_* order.
 */
export function conditionStyle(
  vocabulary: Vocabulary,
  masks: readonly number[],
  bit: number,
): CSSProperties | undefined {
  const colorCount = vocabulary.number("COLORS", "CLR_MAX");
  let color = NO_COLOR;
  let attribute = 0;
  masks.forEach((mask, index) => {
    if ((mask & bit) === 0) return;
    if (index < colorCount) color = index;
    else attribute |= ATTRIBUTE_BITS[index - colorCount - 1] ?? 0;
  });
  return highlightStyle({ color, attribute });
}
