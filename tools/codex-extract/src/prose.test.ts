import { describe, expect, it } from "vitest";
import { parseDataBase } from "./prose.ts";

describe("parseDataBase", () => {
  it("groups consecutive keys with the tab-indented text that follows, verbatim", () => {
    const source = [
      "# comment",
      "floating eye",
      "\tFloating eyes, not surprisingly, are large, floating eyeballs",
      "\twhich drift about the dungeon.",
      "*flute",
      "magic flute",
      "\tWith this thou canst do mighty deeds",
      "\t\t[ The Magic Flute ]",
      "",
    ].join("\n");
    expect(parseDataBase(source)).toEqual([
      {
        keys: ["floating eye"],
        text: "\tFloating eyes, not surprisingly, are large, floating eyeballs\n\twhich drift about the dungeon.",
      },
      {
        keys: ["*flute", "magic flute"],
        text: "\tWith this thou canst do mighty deeds\n\t\t[ The Magic Flute ]",
      },
    ]);
  });
});
