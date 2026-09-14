import { usePreferences, useServices } from "../context.js";

const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3] as const;

/** Whole-map framing as the terminal shows it, or follow the hero at a chosen scale. */
export function MapViewControls() {
  const preferences = usePreferences();
  const { preferences: store } = useServices();
  const following = preferences.mapView === "follow";
  const index = ZOOM_STEPS.findIndex((step) => step >= preferences.mapZoom);
  const step = (direction: -1 | 1) => {
    const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, index + direction))];
    if (next !== undefined) store.update({ mapZoom: next });
  };
  return (
    <fieldset className="map-view" aria-label="Map view">
      <button
        type="button"
        aria-pressed={following}
        title={following ? "Show the whole map" : "Follow the hero"}
        onClick={() => store.update({ mapView: following ? "whole" : "follow" })}
      >
        {following ? "Whole map" : "Follow"}
      </button>
      {following ? (
        <>
          <button
            type="button"
            aria-label="Zoom out"
            disabled={index <= 0}
            onClick={() => step(-1)}
          >
            −
          </button>
          <span className="map-zoom">{preferences.mapZoom}×</span>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={index >= ZOOM_STEPS.length - 1}
            onClick={() => step(1)}
          >
            +
          </button>
        </>
      ) : null}
    </fieldset>
  );
}
