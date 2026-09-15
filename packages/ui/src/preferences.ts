/**
 * Player preferences. `uiMode` names the preset applied last; everything else
 * is an individual switch the player may change afterwards, so the two modes
 * are starting points rather than branches in the code.
 */
export type UiMode = "newcomer" | "veteran";

export interface Preferences {
  readonly uiMode: UiMode;
  readonly showMapTooltips: boolean;
  readonly showSightings: boolean;
  readonly offerTutorial: boolean;
  /** On-screen controls: shown on coarse-pointer devices, or forced either way. */
  readonly touchControls: "auto" | "always" | "never";
  readonly tilesetId: string;
  readonly rendererId: string;
  /** With sprite tilesets, draw the engine's terrain glyph beneath creatures and items. */
  readonly terrainBeneath: boolean;
}

const KEYS: readonly (keyof Preferences)[] = [
  "uiMode",
  "showMapTooltips",
  "showSightings",
  "offerTutorial",
  "touchControls",
  "tilesetId",
  "rendererId",
  "terrainBeneath",
];

export const PRESETS: Readonly<Record<UiMode, Preferences>> = {
  newcomer: {
    uiMode: "newcomer",
    showMapTooltips: true,
    showSightings: true,
    offerTutorial: true,
    touchControls: "auto",
    tilesetId: "official",
    rendererId: "canvas",
    terrainBeneath: true,
  },
  veteran: {
    uiMode: "veteran",
    showMapTooltips: false,
    showSightings: false,
    offerTutorial: false,
    touchControls: "auto",
    tilesetId: "typographic",
    rendererId: "canvas",
    terrainBeneath: false,
  },
};

/** Labels shown to players; the code keeps the plain names. */
export const UI_MODE_LABELS: Readonly<Record<UiMode, string>> = {
  newcomer: "Guided",
  veteran: "Classic",
};

const STORAGE_KEY = "nethack-web.preferences";

export type PreferencesListener = () => void;

/** Observable preferences persisted per browser. */
export class PreferencesStore {
  private current: Preferences;
  private readonly listeners = new Set<PreferencesListener>();

  constructor(private readonly storage: Storage | null = safeLocalStorage()) {
    this.current = this.load();
  }

  getSnapshot = (): Preferences => this.current;

  subscribe = (listener: PreferencesListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  update(changes: Partial<Preferences>): void {
    this.set({ ...this.current, ...changes });
  }

  applyPreset(mode: UiMode): void {
    this.set(PRESETS[mode]);
  }

  private set(next: Preferences): void {
    this.current = next;
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable (private mode, quota); preferences stay in memory.
    }
    for (const listener of this.listeners) listener();
  }

  private load(): Preferences {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Record<string, unknown>;
        const known = Object.fromEntries(
          KEYS.filter((key) => key in stored).map((key) => [key, stored[key]]),
        );
        return { ...PRESETS.newcomer, ...(known as Partial<Preferences>) };
      }
    } catch {
      // Fall through to the default preset.
    }
    return PRESETS.newcomer;
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
