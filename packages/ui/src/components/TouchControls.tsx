import { useGame, useSession } from "../context.js";

interface Control {
  readonly label: string;
  readonly key: string;
  readonly title: string;
}

const DIRECTIONS: readonly (Control | null)[] = [
  { label: "↖", key: "y", title: "Move up-left" },
  { label: "↑", key: "k", title: "Move up" },
  { label: "↗", key: "u", title: "Move up-right" },
  { label: "←", key: "h", title: "Move left" },
  { label: "·", key: ".", title: "Wait a turn" },
  { label: "→", key: "l", title: "Move right" },
  { label: "↙", key: "b", title: "Move down-left" },
  { label: "↓", key: "j", title: "Move down" },
  { label: "↘", key: "n", title: "Move down-right" },
];

const ACTIONS: readonly Control[] = [
  { label: "Search", key: "s", title: "Search around you" },
  { label: "Pick up", key: ",", title: "Pick up what is here" },
  { label: "Inventory", key: "i", title: "Show inventory" },
  { label: "Eat", key: "e", title: "Eat something" },
  { label: "Open", key: "o", title: "Open a door" },
  { label: "Kick", key: "\x0b", title: "Kick" },
  { label: "Down", key: ">", title: "Go down stairs" },
  { label: "Up", key: "<", title: "Go up stairs" },
  { label: "Esc", key: "\x1b", title: "Cancel" },
];

/** On-screen movement and common commands for touch play; keys go to the engine like typed ones. */
export function TouchControls() {
  const game = useGame();
  const session = useSession();
  const enabled = game.request?.type === "getKeyOrPosition" || game.request?.type === "getKey";
  const send = (key: string) => {
    const code = key.charCodeAt(0);
    if (game.request?.type === "getKeyOrPosition")
      session.answer("getKeyOrPosition", { key: code });
    else if (game.request?.type === "getKey") session.answer("getKey", { key: code });
  };
  return (
    <nav className="touch" aria-label="Touch controls">
      <div className="touch-pad">
        {DIRECTIONS.map((control, index) =>
          control === null ? (
            <span key={`gap-${String(index)}`} />
          ) : (
            <button
              key={control.key}
              type="button"
              title={control.title}
              disabled={!enabled}
              onPointerDown={(event) => {
                event.preventDefault();
                send(control.key);
              }}
            >
              {control.label}
            </button>
          ),
        )}
      </div>
      <div className="touch-actions">
        {ACTIONS.map((control) => (
          <button
            key={control.key}
            type="button"
            title={control.title}
            disabled={!enabled}
            onPointerDown={(event) => {
              event.preventDefault();
              send(control.key);
            }}
          >
            {control.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
