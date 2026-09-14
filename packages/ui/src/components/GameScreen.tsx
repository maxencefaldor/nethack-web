import type { EntityRef } from "@nethack-web/codex";
import type { MapRenderer, Tileset } from "@nethack-web/renderer";
import { useEffect, useState } from "react";
import { useGame, usePreferences } from "../context.js";
import { useEngineKeyboard } from "../keyboard.js";
import { CodexPanel } from "./CodexPanel.js";
import { CommandPalette } from "./CommandPalette.js";
import { FileDialog } from "./FileDialog.js";
import { InventoryPanel } from "./InventoryPanel.js";
import { MapCanvas } from "./MapCanvas.js";
import { MapViewControls } from "./MapViewControls.js";
import { MenuDialog } from "./MenuDialog.js";
import { MessageHistoryDialog } from "./MessageHistoryDialog.js";
import { MessageLog } from "./MessageLog.js";
import { Overlay } from "./Overlay.js";
import { PromptBar } from "./PromptBar.js";
import { SettingsDialog } from "./SettingsDialog.js";
import { SightingsStrip } from "./SightingsStrip.js";
import { StatusBar } from "./StatusBar.js";
import { TextDialog } from "./TextDialog.js";
import { TouchControls } from "./TouchControls.js";
import { YesNoBar } from "./YesNoBar.js";

export interface GameScreenProps {
  readonly renderer: MapRenderer;
  readonly tileset: Tileset;
}

/** The playing screen: messages above, map centre, status below, inventory beside. */
export function GameScreen({ renderer, tileset }: GameScreenProps) {
  const game = useGame();
  const preferences = usePreferences();
  const [palette, setPalette] = useState(false);
  const [settings, setSettings] = useState(false);
  const [codex, setCodex] = useState<{ open: boolean; at: EntityRef | undefined }>({
    open: false,
    at: undefined,
  });
  const inspect = (ref: EntityRef) => setCodex({ open: true, at: ref });
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const touch =
    preferences.touchControls === "always" ||
    (preferences.touchControls === "auto" && coarsePointer);
  useEngineKeyboard();
  useEffect(() => {
    if (!preferences.showCommandPalette) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === "F1") {
        event.preventDefault();
        setPalette((open) => !open);
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [preferences.showCommandPalette]);

  const request = game.request;
  const menuWindow = request?.type === "selectMenu" ? game.windows[request.window] : undefined;
  const blockingWindow =
    request?.type === "displayWindowBlocking" ? game.windows[request.window] : undefined;
  const popup =
    blockingWindow !== undefined &&
    (blockingWindow.kind === "menu" || blockingWindow.kind === "text");

  return (
    <div className="screen">
      <MapCanvas renderer={renderer} tileset={tileset} onInspect={inspect} />
      <div className="hud hud-top-left">
        <MessageLog />
        {request?.type === "yesNo" ? <YesNoBar request={request} /> : null}
        {request?.type === "getLine" ||
        request?.type === "askName" ||
        request?.type === "getExtendedCommand" ? (
          <PromptBar key={request.type} request={request} />
        ) : null}
        {preferences.showSightings ? <SightingsStrip onOpen={inspect} /> : null}
      </div>
      <nav className="hud hud-top-right toolbar" aria-label="Tools">
        <MapViewControls />
        {preferences.showCommandPalette ? (
          <button type="button" onClick={() => setPalette(true)} title="Commands (F1)">
            Commands
          </button>
        ) : null}
        <button type="button" onClick={() => setCodex({ open: true, at: undefined })}>
          Codex
        </button>
        <button type="button" onClick={() => setSettings(true)}>
          Settings
        </button>
      </nav>
      {preferences.showInventoryPanel ? (
        <div className="hud hud-right">
          <InventoryPanel />
        </div>
      ) : null}
      <div className="hud hud-bottom-left">
        <StatusBar />
      </div>
      {touch ? (
        <div className="hud hud-bottom">
          <TouchControls />
        </div>
      ) : null}
      {menuWindow?.menu && request?.type === "selectMenu" ? (
        <MenuDialog key={request.window} menu={menuWindow.menu} mode={request.mode} />
      ) : null}
      {popup && blockingWindow ? <TextDialog window={blockingWindow} /> : null}
      {request?.type === "previousMessage" ? <MessageHistoryDialog /> : null}
      {request?.type === "displayFile" ? <FileDialog request={request} /> : null}
      {palette ? <CommandPalette onClose={() => setPalette(false)} /> : null}
      {codex.open ? (
        <CodexPanel initial={codex.at} onClose={() => setCodex({ open: false, at: undefined })} />
      ) : null}
      {settings ? <SettingsDialog onClose={() => setSettings(false)} /> : null}
      {game.phase === "exited" ? (
        <Overlay label="Game over">
          <h2 className="dialog-title">The game has ended</h2>
          <p>Your progress is saved. Reload to return to the title screen.</p>
          <footer className="dialog-actions">
            <button type="button" className="primary" onClick={() => location.reload()}>
              Title screen
            </button>
          </footer>
        </Overlay>
      ) : null}
    </div>
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);
  return matches;
}
