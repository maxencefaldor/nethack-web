import artifacts from "../data/artifacts.json" with { type: "json" };
import descriptions from "../data/descriptions.json" with { type: "json" };
import layout from "../data/glyph-layout.json" with { type: "json" };
import monsters from "../data/monsters.json" with { type: "json" };
import objects from "../data/objects.json" with { type: "json" };
import symbols from "../data/symbols.json" with { type: "json" };
import vocabulary from "../data/vocabulary.json" with { type: "json" };
import { Codex, type CodexData } from "./codex.js";
import { type DescriptionSource, layered, OfficialDescriptions } from "./descriptions.js";
import { EngineVocabulary } from "./vocabulary.js";

export const OFFICIAL_DATA: CodexData = { monsters, objects, artifacts, symbols, layout };

export const officialDescriptions = new OfficialDescriptions(descriptions);

export const officialVocabulary = new EngineVocabulary(vocabulary);

/** The codex for the engine build this client ships, with optional custom prose layered on top. */
export function officialCodex(...custom: readonly DescriptionSource[]): Codex {
  return new Codex(OFFICIAL_DATA, layered(...custom, officialDescriptions));
}
