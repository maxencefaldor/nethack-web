import { Check, ChevronDown } from "lucide-react";
import { Select } from "radix-ui";
import { useEffect, useId, useState } from "react";
import { type TilesetChoice, usePreferences, useServices } from "../context.js";
import { UI_MODE_LABELS, type UiMode } from "../preferences.js";
import { Modal } from "./Modal.js";

interface ChoiceProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly onChange: (value: T) => void;
}

function Choice<T extends string>({ label, value, options, onChange }: ChoiceProps<T>) {
  const id = useId();
  return (
    <div className="settings-option">
      <label htmlFor={id}>{label}</label>
      <Select.Root value={value} onValueChange={(next) => onChange(next as T)}>
        <Select.Trigger id={id} className="select-trigger" aria-label={label}>
          <Select.Value />
          <Select.Icon>
            <ChevronDown size={16} aria-hidden="true" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="select-content" position="popper" sideOffset={4}>
            <Select.Viewport>
              {options.map((option) => (
                <Select.Item key={option.value} value={option.value} className="select-item">
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={14} aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="settings-option">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

/** Preferences: a preset to start from, then the individual switches. */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const preferences = usePreferences();
  const { preferences: store, tilesetChoices } = useServices();
  const [tilesets, setTilesets] = useState<readonly TilesetChoice[]>([]);
  useEffect(() => {
    void tilesetChoices().then(setTilesets);
  }, [tilesetChoices]);
  return (
    <Modal title="Settings" className="settings" onDismiss={onClose}>
      <fieldset className="settings-group">
        <legend>Experience</legend>
        <Choice
          label="Preset"
          value={preferences.uiMode}
          options={(Object.keys(UI_MODE_LABELS) as UiMode[]).map((mode) => ({
            value: mode,
            label: UI_MODE_LABELS[mode],
          }))}
          onChange={(mode) => store.applyPreset(mode)}
        />
      </fieldset>
      <fieldset className="settings-group">
        <legend>Map</legend>
        <Choice
          label="Tileset"
          value={preferences.tilesetId}
          options={tilesets.map((choice) => ({ value: choice.id, label: choice.name }))}
          onChange={(tilesetId) => store.update({ tilesetId })}
        />
        <Toggle
          label="Terrain beneath creatures and items (sprite tilesets)"
          checked={preferences.terrainBeneath}
          onChange={(terrainBeneath) => store.update({ terrainBeneath })}
        />
      </fieldset>
      <fieldset className="settings-group">
        <legend>Touch</legend>
        <Choice
          label="On-screen controls"
          value={preferences.touchControls}
          options={[
            { value: "auto", label: "When using touch" },
            { value: "always", label: "Always" },
            { value: "never", label: "Never" },
          ]}
          onChange={(touchControls) => store.update({ touchControls })}
        />
      </fieldset>
      <fieldset className="settings-group">
        <legend>Help</legend>
        <Toggle
          label="Name things under the pointer"
          checked={preferences.showMapTooltips}
          onChange={(showMapTooltips) => store.update({ showMapTooltips })}
        />
        <Toggle
          label="Point out creatures seen for the first time"
          checked={preferences.showSightings}
          onChange={(showSightings) => store.update({ showSightings })}
        />
        <Toggle
          label="Offer the tutorial when a game starts"
          checked={preferences.offerTutorial}
          onChange={(offerTutorial) => store.update({ offerTutorial })}
        />
      </fieldset>
      <footer className="dialog-actions">
        <button type="button" className="primary" onClick={onClose}>
          Done
        </button>
      </footer>
    </Modal>
  );
}
