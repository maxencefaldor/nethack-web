import { useEffect, useState } from "react";
import { useSession } from "../context.js";
import type { SavedGame } from "../session.js";

/** Start a new game or continue a saved one. */
export function TitleScreen({
  onSettings,
  onCodex,
}: {
  onSettings: () => void;
  onCodex: () => void;
}) {
  const session = useSession();
  const [saved, setSaved] = useState<readonly SavedGame[]>([]);
  const [name, setName] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    void session.savedGames().then(setSaved);
  }, [session]);

  const start = (playerName: string | null) => {
    setStarting(true);
    void session.start({ playerName, wizardMode: false });
  };

  return (
    <main className="title">
      <h1 className="title-name">NetHack</h1>
      <p className="title-tagline">The Dungeons of Doom, in your browser.</p>
      <form
        className="title-form"
        onSubmit={(event) => {
          event.preventDefault();
          start(name.trim() || null);
        }}
      >
        <label htmlFor="player-name">Name</label>
        <input
          id="player-name"
          value={name}
          maxLength={31}
          placeholder="Adventurer"
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit" className="primary" disabled={starting}>
          New game
        </button>
      </form>
      {saved.length > 0 ? (
        <section className="title-saves">
          <h2>Continue</h2>
          <ul>
            {saved.map((game) => (
              <li key={game.playerName}>
                <button type="button" disabled={starting} onClick={() => start(game.playerName)}>
                  {game.playerName}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <nav className="title-links">
        <button type="button" className="link" onClick={onCodex}>
          Codex
        </button>
        <button type="button" className="link" onClick={onSettings}>
          Settings
        </button>
      </nav>
    </main>
  );
}
