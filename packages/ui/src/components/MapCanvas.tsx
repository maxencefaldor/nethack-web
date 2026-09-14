import type { EntityRef } from "@nethack-web/codex";
import type { MapRenderer, Tileset } from "@nethack-web/renderer";
import { cellIndex, MAP_COLUMNS } from "@nethack-web/state";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCodex, useGame, usePreferences, useSession, useVocabulary } from "../context.js";

const CLICK_PRIMARY = 1;
const CLICK_SECONDARY = 2;

export interface MapCanvasProps {
  readonly renderer: MapRenderer;
  readonly tileset: Tileset;
  /** Opens the codex at an entity; used for clicks that are not answering the engine. */
  readonly onInspect: (ref: EntityRef) => void;
}

interface Hover {
  readonly x: number;
  readonly y: number;
  readonly title: string;
}

/**
 * Hosts a MapRenderer. Clicks answer the engine when it wants a position;
 * otherwise, in Guided play, they open the codex, and hovering names the cell.
 */
export function MapCanvas({ renderer, tileset, onInspect }: MapCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const game = useGame();
  const session = useSession();
  const codex = useCodex();
  const preferences = usePreferences();
  const vocabulary = useVocabulary();
  const [hover, setHover] = useState<Hover | null>(null);

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

  // Redraws on every snapshot and whenever the host changes size, since the
  // canvas is rasterised at its displayed size.
  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    const draw = () =>
      renderer.render(game.map, tileset, {
        mode: preferences.mapView,
        zoom: preferences.mapZoom,
        focus: game.map.focus ?? hero,
      });
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(host);
    return () => observer.disconnect();
  }, [renderer, tileset, game.map, hero, preferences.mapView, preferences.mapZoom]);

  const cellAt = (event: React.PointerEvent<HTMLDivElement>) => {
    const canvas = event.currentTarget.querySelector("canvas");
    if (canvas === null) return null;
    const bounds = canvas.getBoundingClientRect();
    return renderer.pick({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  };

  const entityAt = (x: number, y: number): EntityRef | null => {
    const glyph = game.map.cells[cellIndex(x, y)];
    return glyph === null || glyph === undefined ? null : codex.entityForGlyph(glyph.glyph);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const cell = cellAt(event);
    if (cell === null) return;
    const answering = game.request?.type === "getKeyOrPosition" && !event.altKey;
    if (answering && (event.button === 0 || event.button === 2)) {
      event.preventDefault();
      session.answer("getKeyOrPosition", {
        x: cell.x,
        y: cell.y,
        button: event.button === 2 ? CLICK_SECONDARY : CLICK_PRIMARY,
      });
      return;
    }
    const entity = entityAt(cell.x, cell.y);
    if (entity !== null && preferences.showMapTooltips) onInspect(entity);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!preferences.showMapTooltips) return;
    const cell = cellAt(event);
    const entity = cell === null ? null : entityAt(cell.x, cell.y);
    const title = entity === null ? null : (codex.page(entity)?.title ?? null);
    setHover(title === null ? null : { x: event.clientX, y: event.clientY, title });
  };

  return (
    <div
      ref={hostRef}
      className="map"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
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
  );
}
