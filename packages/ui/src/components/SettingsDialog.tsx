import { useEffect, useState } from "react";
import { type TilesetChoice, usePreferences, useServices } from "../context.js";
import { UI_MODE_LABELS, type UiMode } from "../preferences.js";
import { Overlay } from "./Overlay.js";

/** Preferences: a preset to start from, then the individual switches. */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const preferences = usePreferences();
  const { preferences: store, tilesetChoices } = useServices();
  const [tilesets, setTilesets] = useState<readonly TilesetChoice[]>([]);
  useEffect(() => {
    void tilesetChoices().then(setTilesets);
  }, [tilesetChoices]);
  return (
    <Overlay label="Settings" className="settings" onDismiss={onClose}>
      <h2 className="dialog-title">Settings</h2>
      <fieldset className="settings-group">
        <legend>Experience</legend>
        {(Object.keys(UI_MODE_LABELS) as UiMode[]).map((mode) => (
          <label key={mode} className="settings-option">
            <input
              type="radio"
              name="uiMode"
              checked={preferences.uiMode === mode}
              onChange={() => store.applyPreset(mode)}
            />
            {UI_MODE_LABELS[mode]}
          </label>
        ))}
      </fieldset>
      <fieldset className="settings-group">
        <legend>Map</legend>
        <label className="settings-option">
          View
          <select
            value={preferences.mapView}
            onChange={(event) =>
              store.update({ mapView: event.target.value as "whole" | "follow" })
            }
          >
            <option value="whole">Whole map, as in the terminal</option>
            <option value="follow">Follow the hero</option>
          </select>
        </label>
        <label className="settings-option">
          Tileset
          <select
            value={preferences.tilesetId}
            onChange={(event) => store.update({ tilesetId: event.target.value })}
          >
            {tilesets.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.name}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      <fieldset className="settings-group">
        <legend>Touch</legend>
        <label className="settings-option">
          On-screen controls
          <select
            value={preferences.touchControls}
            onChange={(event) =>
              store.update({ touchControls: event.target.value as "auto" | "always" | "never" })
            }
          >
            <option value="auto">When using touch</option>
            <option value="always">Always</option>
            <option value="never">Never</option>
          </select>
        </label>
      </fieldset>
      <fieldset className="settings-group">
        <legend>Screen</legend>
        <label className="settings-option">
          <input
            type="checkbox"
            checked={preferences.showInventoryPanel}
            onChange={(event) => store.update({ showInventoryPanel: event.target.checked })}
          />
          Inventory panel
        </label>
        <label className="settings-option">
          <input
            type="checkbox"
            checked={preferences.showCommandPalette}
            onChange={(event) => store.update({ showCommandPalette: event.target.checked })}
          />
          Command button
        </label>
        <label className="settings-option">
          <input
            type="checkbox"
            checked={preferences.showMapTooltips}
            onChange={(event) => store.update({ showMapTooltips: event.target.checked })}
          />
          Name things under the pointer, click to open the codex
        </label>
        <label className="settings-option">
          <input
            type="checkbox"
            checked={preferences.showSightings}
            onChange={(event) => store.update({ showSightings: event.target.checked })}
          />
          Point out creatures seen for the first time
        </label>
        <label className="settings-option">
          <input
            type="checkbox"
            checked={preferences.offerTutorial}
            onChange={(event) => store.update({ offerTutorial: event.target.checked })}
          />
          Offer the tutorial when a game starts
        </label>
      </fieldset>
      <footer className="dialog-actions">
        <button type="button" className="primary" onClick={onClose}>
          Done
        </button>
      </footer>
    </Overlay>
  );
}
