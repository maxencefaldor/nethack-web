import { useEffect, useMemo, useRef, useState } from "react";
import { useGame, useSession } from "../context.js";
import { Overlay } from "./Overlay.js";

/** Extended commands with a search box; Guided players discover the game here. */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const game = useGame();
  const session = useSession();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const commands = game.catalog?.extendedCommands ?? [];
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return commands
      .filter((command) => command.description !== "")
      .filter(
        (command) =>
          needle === "" ||
          command.name.includes(needle) ||
          command.description.toLowerCase().includes(needle),
      )
      .slice(0, 40);
  }, [commands, query]);
  const ready = game.request?.type === "getKeyOrPosition";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const run = (name: string) => {
    session.runExtendedCommand(name);
    onClose();
  };

  return (
    <Overlay label="Commands" className="palette" onDismiss={onClose}>
      <input
        ref={inputRef}
        className="palette-search"
        placeholder="Search commands"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key === "Enter" && matches[0] && ready) run(matches[0].name);
        }}
      />
      {ready ? null : <p className="palette-note">Finish the current prompt first.</p>}
      <ul className="palette-list">
        {matches.map((command) => (
          <li key={command.name}>
            <button type="button" disabled={!ready} onClick={() => run(command.name)}>
              <span className="completion-name">#{command.name}</span>
              {command.key > 32 && command.key < 127 ? (
                <kbd className="palette-key">{String.fromCharCode(command.key)}</kbd>
              ) : null}
              <span className="completion-description">{command.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </Overlay>
  );
}
