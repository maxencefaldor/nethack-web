import type { Codex, EngineVocabulary } from "@nethack-web/codex";
import { Vocabulary } from "@nethack-web/protocol";
import type { GameSnapshot } from "@nethack-web/state";
import { createContext, useContext, useSyncExternalStore } from "react";
import type { Preferences, PreferencesStore } from "./preferences.js";
import type { GameSession } from "./session.js";

export interface TilesetChoice {
  readonly id: string;
  readonly name: string;
}

export interface UiServices {
  readonly session: GameSession;
  readonly preferences: PreferencesStore;
  readonly codex: Codex;
  readonly engineVocabulary: EngineVocabulary;
  /** Tilesets the player may pick from in settings. */
  readonly tilesetChoices: () => Promise<readonly TilesetChoice[]>;
}

export const UiContext = createContext<UiServices | null>(null);

export function useServices(): UiServices {
  const services = useContext(UiContext);
  if (services === null) throw new Error("UiContext is not provided");
  return services;
}

export function useSession(): GameSession {
  return useServices().session;
}

export function useCodex(): Codex {
  return useServices().codex;
}

export function useGame(): GameSnapshot {
  const { store } = useSession();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export function usePreferences(): Preferences {
  const { preferences } = useServices();
  return useSyncExternalStore(
    preferences.subscribe,
    preferences.getSnapshot,
    preferences.getSnapshot,
  );
}

/** The engine vocabulary once the catalog has arrived, cached per catalog. */
export function useVocabulary(): Vocabulary | null {
  const game = useGame();
  if (game.catalog === null) return null;
  let vocabulary = vocabularies.get(game.catalog);
  if (vocabulary === undefined) {
    vocabulary = new Vocabulary(game.catalog.constants);
    vocabularies.set(game.catalog, vocabulary);
  }
  return vocabulary;
}

const vocabularies = new WeakMap<object, Vocabulary>();
