import type { EntityRef } from "@nethack-web/codex";
import type { MapRenderer, Tileset } from "@nethack-web/renderer";
import { cellIndex, MAP_COLUMNS } from "@nethack-web/state";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCodex, useGame, usePreferences, useSession, useVocabulary } from "../context.js";
import { type MapViewport, useMapViewport } from "../viewport.js";
import { MapViewControls } from "./MapViewControls.js";

/** The engine's mouse button code for a normal click. */
const CLICK_PRIMARY = 1;

export interface MapCanvasProps {
  readonly renderer: MapRenderer;
  readonly tileset: Tileset;
  /** Opens the codex at an entity; used for taps that are not answering the engine. */
  readonly onInspect: (ref: EntityRef) => void;
}

interface Hover {
  readonly x: number;
  readonly y: number;
  readonly title: string;
}

/**
 * Hosts a MapRenderer under a camera the player can drag and zoom. Taps
 * answer the engine when it wants a position; otherwise they open the codex
 * for whatever is in the cell.
 */
export function MapCanvas({ renderer, tileset, onInspect }: MapCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const game = useGame();
  const session = useSession();
  const codex = useCodex();
  const preferences = usePreferences();
  const vocabulary = useVocabulary();
  const [hover, setHover] = useState<Hover | null>(null);

  const entityAt = (x: number, y: number): EntityRef | null => {
    const glyph = game.map.cells[cellIndex(x, y)];
    return glyph === null || glyph === undefined ? null : codex.entityForGlyph(glyph.glyph);
  };

  // A left click opens the codex for the cell. A right click hands the position
  // to the game, which is how travel prompts and click-to-move are answered.
  const viewport: MapViewport = useMapViewport(hostRef, tileset, (point, event) => {
    const cell = renderer.pick(point);
    if (cell === null) return;
    if (event.button === 2) {
      if (game.request?.type === "getKeyOrPosition") {
        session.answer("getKeyOrPosition", { x: cell.x, y: cell.y, button: CLICK_PRIMARY });
      }
      return;
    }
    const entity = entityAt(cell.x, cell.y);
    if (entity !== null) onInspect(entity);
  });

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    renderer.mount(host);
    return () => renderer.dispose();
  }, [renderer]);

  const heroBit = vocabulary?.number("MG", "MG_HERO") ?? 0;
  const hero = useMemo(() => {
    if (heroBit === 0) return null;
    const index = game.map.cells.findIndex((cell) => cell !== null && (cell.flags & heroBit) !== 0);
    return index < 0 ? null : { x: index % MAP_COLUMNS, y: Math.floor(index / MAP_COLUMNS) };
  }, [game.map.cells, heroBit]);

  const { following, centerOnCell } = viewport;
  useEffect(() => {
    if (following && hero !== null) centerOnCell(hero);
  }, [following, hero, centerOnCell]);

  useEffect(() => {
    renderer.render(game.map, tileset, viewport.camera, {
      terrainBeneath: preferences.terrainBeneath,
    });
  }, [renderer, tileset, game.map, viewport.camera, preferences.terrainBeneath]);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    viewport.handlers.onPointerMove(event);
    if (!preferences.showMapTooltips) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const cell = renderer.pick({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    const entity = cell === null ? null : entityAt(cell.x, cell.y);
    const title = entity === null ? null : (codex.page(entity)?.title ?? null);
    setHover(title === null ? null : { x: event.clientX, y: event.clientY, title });
  };

  return (
    <>
      <div
        ref={hostRef}
        className={`map${viewport.dragging ? " map-dragging" : ""}`}
        onPointerDown={viewport.handlers.onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={viewport.handlers.onPointerUp}
        onPointerCancel={viewport.handlers.onPointerCancel}
        onPointerLeave={() => setHover(null)}
        onContextMenu={(event) => event.preventDefault()}
        role="img"
        aria-label="Dungeon map"
      >
        {hover ? (
          <span className="map-tooltip" style={{ left: hover.x + 12, top: hover.y + 12 }}>
            {hover.title}
          </span>
        ) : null}
      </div>
      <MapViewControls viewport={viewport} />
    </>
  );
}
