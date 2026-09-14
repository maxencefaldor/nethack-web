import { useEffect } from "react";
import { useGame, useSession } from "./context.js";
import { engineKeyCode, KEY_ENTER, KEY_ESCAPE, KEY_SPACE } from "./keys.js";

/** Whether the event originated in a text field the browser should keep. */
function inTextField(event: KeyboardEvent): boolean {
  const target = event.target;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/**
 * Routes keystrokes to whichever request the engine is blocked on.
 * Menus and text prompts own their own keys; everything else lands here.
 */
export function useEngineKeyboard(): void {
  const session = useSession();
  const game = useGame();
  const request = game.request;
  const numberPad = game.numberPad;

  useEffect(() => {
    if (request === null) return;
    const listener = (event: KeyboardEvent) => {
      if (inTextField(event)) return;
      const key = engineKeyCode(event, numberPad);
      if (key === null) return;
      switch (request.type) {
        case "getKey":
          event.preventDefault();
          session.answer("getKey", { key });
          return;
        case "getKeyOrPosition":
          event.preventDefault();
          session.answer("getKeyOrPosition", { key });
          return;
        case "displayWindowBlocking":
          event.preventDefault();
          session.answer("displayWindowBlocking", { dismissed: true });
          return;
        case "messageMenu":
          event.preventDefault();
          session.answer("messageMenu", {
            letter: key === KEY_ESCAPE ? "\x1b" : String.fromCharCode(key),
          });
          return;
        case "yesNo": {
          const { choices, defaultChoice } = request;
          const character = String.fromCharCode(key);
          let answer: string | null = null;
          if (key === KEY_ESCAPE) {
            answer = choices?.includes("q") ? "q" : choices?.includes("n") ? "n" : defaultChoice;
          } else if (choices === null || choices.includes(character)) {
            answer = character;
          } else if (key === KEY_ENTER || key === KEY_SPACE) {
            answer = defaultChoice;
          }
          if (answer === null) return;
          event.preventDefault();
          session.answer("yesNo", { answer });
          return;
        }
        default:
          return;
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [request, numberPad, session]);
}
