import type { EntityRef } from "@nethack-web/codex";
import type { MapRenderer, Tileset } from "@nethack-web/renderer";
import { Backpack, BookOpen, Map as MapIcon, SlidersHorizontal, Terminal } from "lucide-react";
import { Tooltip } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { useGame, usePreferences, useSession } from "../context.js";
import { useHudInsets } from "../hud-insets.js";
import { useEngineKeyboard } from "../keyboard.js";
import { CodexPanel } from "./CodexPanel.js";
import { CommandPalette } from "./CommandPalette.js";
import { EndScreen } from "./EndScreen.js";
import { FileDialog } from "./FileDialog.js";
import { IconButton } from "./IconButton.js";
import { InventoryPanel } from "./InventoryPanel.js";
import { MapCanvas } from "./MapCanvas.js";
import { MenuDialog } from "./MenuDialog.js";
import { MessageHistoryDialog } from "./MessageHistoryDialog.js";
import { MessageLog } from "./MessageLog.js";
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
  const session = useSession();
  const preferences = usePreferences();
  const [palette, setPalette] = useState(false);
  const [settings, setSettings] = useState(false);
  const [inventory, setInventory] = useState(() => window.innerWidth > 800);
  const screenRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const insets = useHudInsets(screenRef, { top: topRef, bottom: bottomRef, right: rightRef });
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
    const listener = (event: KeyboardEvent) => {
      if (event.key === "F1") {
        event.preventDefault();
        setPalette((open) => !open);
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  const request = game.request;
  const menuWindow = request?.type === "selectMenu" ? game.windows[request.window] : undefined;
  const blockingWindow =
    request?.type === "displayWindowBlocking" ? game.windows[request.window] : undefined;
  const popup =
    blockingWindow !== undefined &&
    (blockingWindow.kind === "menu" || blockingWindow.kind === "text");

  return (
    <Tooltip.Provider delayDuration={400}>
      <div className="screen" ref={screenRef}>
        <MapCanvas renderer={renderer} tileset={tileset} insets={insets} onInspect={inspect} />
        <div className="hud-scrim hud-scrim-top" aria-hidden="true" />
        <div className="hud-scrim hud-scrim-bottom" aria-hidden="true" />
        <div className="hud hud-top-left" ref={topRef}>
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
          <IconButton
            icon={Backpack}
            label="Inventory"
            pressed={inventory}
            onClick={() => setInventory((open) => !open)}
          />
          <IconButton icon={Terminal} label="Commands (F1)" onClick={() => setPalette(true)} />
          <IconButton
            icon={MapIcon}
            label="Dungeon overview"
            onClick={() => session.runExtendedCommand("overview")}
          />
          <IconButton
            icon={BookOpen}
            label="Codex"
            onClick={() => setCodex({ open: true, at: undefined })}
          />
          <IconButton icon={SlidersHorizontal} label="Settings" onClick={() => setSettings(true)} />
        </nav>
        {inventory ? (
          <div className="hud hud-right" ref={rightRef}>
            <InventoryPanel onInspect={inspect} />
          </div>
        ) : null}
        <div className="hud hud-bottom-left" ref={bottomRef}>
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
        {game.phase === "exited" ? <EndScreen /> : null}
      </div>
    </Tooltip.Provider>
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
