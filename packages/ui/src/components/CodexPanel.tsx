import type { Artifact, CodexPage, EntityRef, Monster, ObjectKind } from "@nethack-web/codex";
import { monsterName, sameEntity } from "@nethack-web/codex";
import { DUSK_PALETTE } from "@nethack-web/renderer";
import { useEffect, useMemo, useState } from "react";
import { useCodex, useServices } from "../context.js";
import { Overlay } from "./Overlay.js";

export interface CodexPanelProps {
  readonly initial?: EntityRef | undefined;
  readonly onClose: () => void;
}

const KIND_LABELS: Readonly<Record<EntityRef["kind"], string>> = {
  monster: "Creature",
  object: "Item",
  artifact: "Artifact",
  terrain: "Dungeon feature",
};

/** The encyclopedia: search on the left, one page on the right. */
export function CodexPanel({ initial, onClose }: CodexPanelProps) {
  const codex = useCodex();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<EntityRef | null>(initial ?? null);
  const results = useMemo(() => codex.search(query, 80), [codex, query]);
  const page = selected === null ? null : codex.page(selected);

  useEffect(() => {
    const first = results[0];
    if (first === undefined) return;
    if (selected === null || !results.some((entry) => sameEntity(entry.ref, selected))) {
      setSelected(first.ref);
    }
  }, [results, selected]);

  return (
    <Overlay label="Codex" className="codex" onDismiss={onClose}>
      <div className="codex-columns">
        <nav className="codex-nav" aria-label="Codex entries">
          <input
            className="codex-search"
            placeholder="Search creatures, items, features"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Escape" && onClose()}
          />
          <ul className="codex-list">
            {results.map((entry) => (
              <li key={`${entry.ref.kind}-${entry.ref.index}`}>
                <button
                  type="button"
                  className={selected && sameEntity(selected, entry.ref) ? "selected" : ""}
                  onClick={() => setSelected(entry.ref)}
                >
                  <span className="codex-glyph" style={{ color: DUSK_PALETTE[entry.color] }}>
                    {entry.symbol}
                  </span>
                  <span>{entry.title}</span>
                  <span className="codex-kind">{KIND_LABELS[entry.ref.kind]}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <article className="codex-page">
          {page === null ? <p className="panel-empty">Pick an entry.</p> : <Page page={page} />}
        </article>
      </div>
      <footer className="dialog-actions">
        <button type="button" className="primary" onClick={onClose}>
          Close
        </button>
      </footer>
    </Overlay>
  );
}

function Page({ page }: { page: CodexPage }) {
  const codex = useCodex();
  return (
    <>
      <header className="codex-header">
        <span className="codex-glyph codex-glyph-large" style={{ color: DUSK_PALETTE[page.color] }}>
          {page.symbol}
        </span>
        <div>
          <p className="codex-kind">{KIND_LABELS[page.ref.kind]}</p>
          <h2 className="codex-title">{page.title}</h2>
        </div>
      </header>
      {page.ref.kind === "monster" ? (
        <MonsterFacts monster={codex.monster(page.ref.index)} />
      ) : null}
      {page.ref.kind === "object" ? <ObjectFacts object={codex.object(page.ref.index)} /> : null}
      {page.ref.kind === "artifact" ? (
        <ArtifactFacts artifact={codex.artifact(page.ref.index)} />
      ) : null}
      {page.description === null ? (
        <p className="panel-empty">The encyclopedia has no entry for this.</p>
      ) : (
        <section>
          <h3 className="codex-section">
            {page.description.source === "official" ? "From the NetHack encyclopedia" : "Note"}
          </h3>
          <pre className="codex-prose">{page.description.text}</pre>
        </section>
      )}
    </>
  );
}

function Facts({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <dl className="codex-facts">
      {rows
        .filter(([, value]) => value !== "")
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}

function MonsterFacts({ monster }: { monster: Monster | null }) {
  const { engineVocabulary: vocabulary } = useServices();
  if (monster === null) return null;
  const attacks = monster.attacks
    .map((attack) => {
      const dice = attack.dice > 0 || attack.sides > 0 ? ` ${attack.dice}d${attack.sides}` : "";
      return `${vocabulary.label("attack", attack.type)}${dice} ${vocabulary.label("damage", attack.damage)}`;
    })
    .join(", ");
  const names = monster.names.filter(
    (name): name is string => name !== null && name !== monsterName(monster),
  );
  return (
    <Facts
      rows={[
        ["Also", names.join(", ")],
        ["Level", String(monster.level)],
        ["Speed", String(monster.speed)],
        ["Armor class", String(monster.armorClass)],
        ["Magic resistance", String(monster.magicResistance)],
        ["Alignment", vocabulary.label("alignment", monster.alignment)],
        ["Difficulty", String(monster.difficulty)],
        ["Size", vocabulary.label("size", monster.size)],
        ["Attacks", attacks],
        ["Resists", vocabulary.flags("resistance", monster.resistances).join(", ")],
        ["Corpse conveys", vocabulary.flags("resistance", monster.conveys).join(", ")],
        ["Corpse weight", monster.corpseWeight > 0 ? String(monster.corpseWeight) : ""],
        ["Nutrition", monster.nutrition > 0 ? String(monster.nutrition) : ""],
      ]}
    />
  );
}

function ObjectFacts({ object }: { object: ObjectKind | null }) {
  const { engineVocabulary: vocabulary } = useServices();
  if (object === null) return null;
  const damage =
    object.smallDamage > 0 || object.largeDamage > 0
      ? `d${object.smallDamage} small, d${object.largeDamage} large`
      : "";
  return (
    <Facts
      rows={[
        ["Class", object.className],
        ["Appearance", object.description ?? ""],
        ["Weight", String(object.weight)],
        ["Base cost", `${object.cost} zm`],
        ["Material", vocabulary.label("material", object.material)],
        ["Damage", damage],
        ["Nutrition", object.nutrition > 0 ? String(object.nutrition) : ""],
        ["Generation weight", String(object.probability)],
        ["Magical", object.magic ? "yes" : ""],
      ]}
    />
  );
}

function ArtifactFacts({ artifact }: { artifact: Artifact | null }) {
  const codex = useCodex();
  const { engineVocabulary: vocabulary } = useServices();
  if (artifact === null) return null;
  const base = codex.object(artifact.objectIndex);
  return (
    <Facts
      rows={[
        ["Base item", base?.name ?? ""],
        ["Alignment", vocabulary.label("alignment", artifact.alignment)],
        ["Cost", `${artifact.cost} zm`],
        [
          "Attack bonus",
          artifact.attack.dice > 0 || artifact.attack.sides > 0
            ? `+${artifact.attack.dice}d${artifact.attack.sides} ${vocabulary.label("damage", artifact.attack.damage)}`
            : "",
        ],
      ]}
    />
  );
}
