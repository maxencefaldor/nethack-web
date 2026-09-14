import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource-variable/fraunces";
import "@nethack-web/ui/styles.css";
import { officialCodex, officialVocabulary } from "@nethack-web/codex";
import { PreferencesStore, UiContext } from "@nethack-web/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { OpfsSaveStore } from "./persistence/opfs-save-store.js";
import { MemorySaveStore } from "./persistence/save-store.js";
import { LocalGameSession } from "./session.js";
import { TilesetRegistry } from "./tilesets.js";

const saves = (await OpfsSaveStore.open()) ?? new MemorySaveStore();
const preferences = new PreferencesStore();
const session = new LocalGameSession(saves, preferences);
const codex = officialCodex();
const tilesets = new TilesetRegistry();

if (import.meta.env.DEV) {
  Object.assign(globalThis, {
    __nethackDebug: {
      pendingRequest: () => session.store.getSnapshot().request,
      snapshot: () => session.store.getSnapshot(),
    },
  });
}

const root = document.getElementById("root");
if (root === null) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <UiContext
      value={{
        session,
        preferences,
        codex,
        engineVocabulary: officialVocabulary,
        tilesetChoices: () => tilesets.choices(),
      }}
    >
      <App tilesets={tilesets} />
    </UiContext>
  </StrictMode>,
);
