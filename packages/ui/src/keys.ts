export const KEY_ESCAPE = 27;
export const KEY_ENTER = 13;
export const KEY_SPACE = 32;
export const KEY_BACKSPACE = 8;

const VI_ARROWS: Readonly<Record<string, string>> = {
  ArrowLeft: "h",
  ArrowRight: "l",
  ArrowUp: "k",
  ArrowDown: "j",
  Home: "y",
  PageUp: "u",
  End: "b",
  PageDown: "n",
};

const NUMPAD_ARROWS: Readonly<Record<string, string>> = {
  ArrowLeft: "4",
  ArrowRight: "6",
  ArrowUp: "8",
  ArrowDown: "2",
  Home: "7",
  PageUp: "9",
  End: "1",
  PageDown: "3",
};

/**
 * The key code the engine's terminal interface would receive for a browser
 * key event, or null when the event carries no key the engine understands.
 * Control combinations become control characters, Alt or Meta set the high
 * bit as the terminal "meta" convention does.
 */
export function engineKeyCode(event: KeyboardEvent, numberPad: boolean): number | null {
  const arrow = (numberPad ? NUMPAD_ARROWS : VI_ARROWS)[event.key];
  if (arrow !== undefined) return arrow.charCodeAt(0);
  switch (event.key) {
    case "Enter":
      return KEY_ENTER;
    case "Escape":
      return KEY_ESCAPE;
    case "Backspace":
      return KEY_BACKSPACE;
    case "Tab":
      return 9;
    case "Delete":
      return 127;
    default:
      break;
  }
  if (event.key.length !== 1) return null;
  const code = event.key.charCodeAt(0);
  if (event.ctrlKey) return code & 0x1f;
  if (event.altKey || event.metaKey) return code | 0x80;
  return code;
}
