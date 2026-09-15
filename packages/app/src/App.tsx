import { OFFICIAL_DATA } from "@nethack-web/codex";
import { CanvasMapRenderer, type Tileset } from "@nethack-web/renderer";
import {
  CodexPanel,
  GameScreen,
  SettingsDialog,
  TitleScreen,
  useGame,
  usePreferences,
  useVocabulary,
} from "@nethack-web/ui";
import { useEffect, useMemo, useState } from "react";
import type { TilesetRegistry } from "./tilesets.js";

/** Chooses between the title screen and the game, and builds the drawing stack once the engine is known. */
export function App({ tilesets }: { tilesets: TilesetRegistry }) {
  const game = useGame();
  const preferences = usePreferences();
  const vocabulary = useVocabulary();
  const [settings, setSettings] = useState(false);
  const [codex, setCodex] = useState(false);
  const [tileset, setTileset] = useState<Tileset | null>(null);
  const renderer = useMemo(() => new CanvasMapRenderer(), []);

  useEffect(() => {
    if (vocabulary === null) return;
    let current = true;
    void tilesets.load(preferences.tilesetId, vocabulary, OFFICIAL_DATA.layout).then((loaded) => {
      if (current) setTileset(loaded);
    });
    return () => {
      current = false;
    };
  }, [tilesets, preferences.tilesetId, vocabulary]);

  if (game.phase === "booting" || tileset === null) {
    return (
      <>
        <TitleScreen onSettings={() => setSettings(true)} onCodex={() => setCodex(true)} />
        {settings ? <SettingsDialog onClose={() => setSettings(false)} /> : null}
        {codex ? <CodexPanel onClose={() => setCodex(false)} /> : null}
      </>
    );
  }
  return <GameScreen renderer={renderer} tileset={tileset} />;
}
