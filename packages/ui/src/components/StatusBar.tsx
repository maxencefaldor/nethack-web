import type { StatusField } from "@nethack-web/protocol";
import type { StatusSnapshot } from "@nethack-web/state";
import { useGame, useVocabulary } from "../context.js";

/** Condition labels as the terminal status line abbreviates them, keyed by BL_MASK_* name. */
const CONDITION_LABELS: Readonly<Record<string, string>> = {
  BL_MASK_BAREH: "Bare",
  BL_MASK_BLIND: "Blind",
  BL_MASK_BUSY: "Busy",
  BL_MASK_CONF: "Conf",
  BL_MASK_DEAF: "Deaf",
  BL_MASK_ELF_IRON: "Iron",
  BL_MASK_FLY: "Fly",
  BL_MASK_FOODPOIS: "FoodPois",
  BL_MASK_GLOWHANDS: "Glow",
  BL_MASK_GRAB: "Grab",
  BL_MASK_HALLU: "Hallu",
  BL_MASK_HELD: "Held",
  BL_MASK_ICY: "Icy",
  BL_MASK_INLAVA: "Lava",
  BL_MASK_LEV: "Lev",
  BL_MASK_PARLYZ: "Paral",
  BL_MASK_RIDE: "Ride",
  BL_MASK_SLEEPING: "Sleep",
  BL_MASK_SLIME: "Slime",
  BL_MASK_SLIPPERY: "Slip",
  BL_MASK_STONE: "Stone",
  BL_MASK_STRNGL: "Strngl",
  BL_MASK_STUN: "Stun",
  BL_MASK_SUBMERGED: "Sub",
  BL_MASK_TERMILL: "TermIll",
  BL_MASK_TETHERED: "Teth",
  BL_MASK_TRAPPED: "Trap",
  BL_MASK_UNCONSC: "Out",
  BL_MASK_WOUNDEDL: "Legs",
  BL_MASK_HOLDING: "Hold",
};

function text(status: StatusSnapshot, field: StatusField): string {
  return status.fields[field]?.text.trim() ?? "";
}

function Field({ label, value, className }: { label?: string; value: string; className?: string }) {
  if (value === "") return null;
  return (
    <span className={`status-field${className ? ` ${className}` : ""}`}>
      {label ? <span className="status-label">{label}:</span> : null}
      {value}
    </span>
  );
}

/** The bottom line, laid out as the terminal does but with a hit-point bar. */
export function StatusBar() {
  const { status } = useGame();
  const vocabulary = useVocabulary();
  const hp = Number.parseInt(text(status, "HP"), 10);
  const hpMax = Number.parseInt(text(status, "HPMAX"), 10);
  const hpPercent =
    Number.isFinite(hp) && hpMax > 0 ? Math.max(0, Math.min(100, (hp / hpMax) * 100)) : null;
  const conditions =
    vocabulary === null
      ? []
      : Object.entries(vocabulary.scope("BL_MASK"))
          .filter(([, bit]) => typeof bit === "number" && (status.conditions & bit) !== 0)
          .map(([name]) => CONDITION_LABELS[name] ?? name.replace("BL_MASK_", ""));
  const experience = text(status, "EXP")
    ? `${text(status, "XP")}/${text(status, "EXP")}`
    : text(status, "XP");

  return (
    <footer className="status">
      <div className="status-row">
        <Field value={text(status, "TITLE")} className="status-title" />
        <Field label="St" value={text(status, "STR")} />
        <Field label="Dx" value={text(status, "DX")} />
        <Field label="Co" value={text(status, "CO")} />
        <Field label="In" value={text(status, "IN")} />
        <Field label="Wi" value={text(status, "WI")} />
        <Field label="Ch" value={text(status, "CH")} />
        <Field value={text(status, "ALIGN")} />
        <Field label="S" value={text(status, "SCORE")} />
      </div>
      <div className="status-row">
        <Field value={text(status, "LEVELDESC")} />
        <Field label="$" value={text(status, "GOLD").replace(/^:/, "")} />
        <span className="status-field status-hp">
          <span className="status-label">HP</span>
          {text(status, "HP")}({text(status, "HPMAX")})
          {hpPercent === null ? null : (
            <span className="hp-bar" aria-hidden="true">
              <span
                className={`hp-fill${hpPercent <= 25 ? " hp-critical" : hpPercent <= 50 ? " hp-low" : ""}`}
                style={{ width: `${hpPercent}%` }}
              />
            </span>
          )}
        </span>
        <Field label="Pw" value={`${text(status, "ENE")}(${text(status, "ENEMAX")})`} />
        <Field label="AC" value={text(status, "AC")} />
        <Field label="HD" value={text(status, "HD")} />
        <Field label="Xp" value={experience} />
        <Field label="T" value={text(status, "TIME")} />
        <Field value={text(status, "HUNGER")} className="status-warning" />
        <Field value={text(status, "CAP")} className="status-warning" />
        {conditions.map((condition) => (
          <Field key={condition} value={condition} className="status-condition" />
        ))}
      </div>
    </footer>
  );
}
