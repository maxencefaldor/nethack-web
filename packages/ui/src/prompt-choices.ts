import type { EngineRequest } from "@nethack-web/protocol";

type YesNoRequest = Extract<EngineRequest, { type: "yesNo" }>;

const ESCAPE = "\x1b";
/** NetHack writes the keys a prompt accepts at its end, as in "Really attack? [ynq]". */
const DOCUMENTED_KEYS = /\[([^[\]\s]+)\]\s*$/;

/**
 * The answers a yes/no style prompt can be given by pointing rather than
 * typing. The engine usually passes the allowed keys explicitly; when it
 * accepts any key and validates the answer itself (character selection does
 * this), it still documents the meaningful keys in the question, following
 * its own bracket convention. Prompts documenting nothing yield no choices,
 * and the caller must offer a way to type a key.
 */
export function promptChoices(request: YesNoRequest): readonly string[] {
  const keys = request.choices ?? DOCUMENTED_KEYS.exec(request.question)?.[1] ?? "";
  return [...keys].filter((key) => key !== ESCAPE && key > " ");
}
