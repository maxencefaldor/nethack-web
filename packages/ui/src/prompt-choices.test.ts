import { describe, expect, it } from "vitest";
import { promptChoices } from "./prompt-choices.js";

const prompt = (question: string, choices: string | null) =>
  ({ type: "yesNo", question, choices, defaultChoice: "" }) as const;

describe("promptChoices", () => {
  it("uses the engine's explicit choices, dropping escape and control keys", () => {
    expect(promptChoices(prompt("Really attack?", "yn\x1bq"))).toEqual(["y", "n", "q"]);
  });

  it("reads the keys the question documents when any key is accepted", () => {
    expect(
      promptChoices(
        prompt("Shall I pick character's race, role, gender and alignment for you? [ynaq]", null),
      ),
    ).toEqual(["y", "n", "a", "q"]);
  });

  it("offers nothing for an any-key prompt that documents no keys", () => {
    expect(promptChoices(prompt("Press a key", null))).toEqual([]);
    expect(promptChoices(prompt("Which [item] do you mean?", null))).toEqual([]);
  });
});
