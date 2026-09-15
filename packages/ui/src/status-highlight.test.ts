import { Vocabulary } from "@nethack-web/protocol";
import { describe, expect, it } from "vitest";
import { conditionStyle, HL_BOLD, HL_INVERSE, highlightStyle } from "./status-highlight.js";

const vocabulary = new Vocabulary({ COLORS: { CLR_MAX: 16, NO_COLOR: 8, CLR_RED: 1 } });

describe("status highlights", () => {
  it("renders no style for the engine's default colour and no attributes", () => {
    expect(highlightStyle({ color: 8, attribute: 0 })).toBeUndefined();
    expect(highlightStyle(undefined)).toBeUndefined();
  });

  it("maps colour and attribute bits to inline style", () => {
    expect(highlightStyle({ color: 1, attribute: HL_BOLD })).toEqual({
      color: "#e0665c",
      fontWeight: 600,
    });
    expect(highlightStyle({ color: 8, attribute: HL_INVERSE })).toEqual({
      background: "var(--ink)",
      color: "var(--ground)",
    });
  });

  it("reads a condition's colour and attributes out of the mask array", () => {
    const masks = new Array<number>(24).fill(0);
    masks[1] = 0b0110; // red for conditions 2 and 4
    masks[16 + 2] = 0b0100; // bold (HL_ATTCLR_BOLD is CLR_MAX + 2) for condition 4
    expect(conditionStyle(vocabulary, masks, 0b0100)).toEqual({
      color: "#e0665c",
      fontWeight: 600,
    });
    expect(conditionStyle(vocabulary, masks, 0b0010)).toEqual({ color: "#e0665c" });
    expect(conditionStyle(vocabulary, masks, 0b1000)).toBeUndefined();
  });
});
