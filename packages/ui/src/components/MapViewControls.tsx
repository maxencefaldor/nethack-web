import { LocateFixed, Maximize } from "lucide-react";
import type { MapViewport } from "../viewport.js";
import { IconButton } from "./IconButton.js";

/** Follow keeps the hero centred at the current zoom; Reset returns to the whole map. */
export function MapViewControls({ viewport }: { viewport: MapViewport }) {
  return (
    <fieldset className="hud hud-bottom-right map-view" aria-label="Map view">
      <IconButton
        icon={LocateFixed}
        label={viewport.following ? "Stop following the hero" : "Follow the hero"}
        pressed={viewport.following}
        onClick={() => viewport.setFollowing(!viewport.following)}
      />
      <IconButton icon={Maximize} label="Reset view" onClick={viewport.reset} />
    </fieldset>
  );
}
