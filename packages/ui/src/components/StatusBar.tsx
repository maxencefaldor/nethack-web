import type { StatusField } from "@nethack-web/protocol";
import type { StatusSnapshot } from "@nethack-web/state";
import type { CSSProperties } from "react";
import { useGame, useVocabulary } from "../context.js";
import { conditionStyle, highlightStyle } from "../status-highlight.js";

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

interface FieldProps {
  readonly label?: string | undefined;
  readonly value: string;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
}

function Field({ label, value, className, style }: FieldProps) {
  if (value === "") return null;
  return (
    <span className={`status-field${className ? ` ${className}` : ""}`} style={style}>
      {label ? <span className="status-label">{label}:</span> : null}
      {value}
    </span>
  );
}

/**
 * The bottom line, laid out as the terminal does, plus a hit-point bar.
 * Colours and attributes are the engine's own status highlights.
 */
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
          .filter((entry): entry is [string, number] => typeof entry[1] === "number")
          .filter(([, bit]) => (status.conditions & bit) !== 0)
          .map(([name, bit]) => ({
            label: CONDITION_LABELS[name] ?? name.replace("BL_MASK_", ""),
            style: conditionStyle(vocabulary, status.conditionColorMasks, bit),
          }));
  const experience = text(status, "EXP")
    ? `${text(status, "XP")}/${text(status, "EXP")}`
    : text(status, "XP");
  const styleOf = (field: StatusField) => highlightStyle(status.fields[field]?.highlight);
  const stat = (label: string, field: StatusField) => (
    <Field label={label} value={text(status, field)} style={styleOf(field)} />
  );

  return (
    <footer className="status">
      <div className="status-row">
        <Field value={text(status, "TITLE")} className="status-title" style={styleOf("TITLE")} />
        {stat("St", "STR")}
        {stat("Dx", "DX")}
        {stat("Co", "CO")}
        {stat("In", "IN")}
        {stat("Wi", "WI")}
        {stat("Ch", "CH")}
        <Field value={text(status, "ALIGN")} style={styleOf("ALIGN")} />
        {stat("S", "SCORE")}
      </div>
      <div className="status-row">
        <Field value={text(status, "LEVELDESC")} style={styleOf("LEVELDESC")} />
        <Field label="$" value={text(status, "GOLD").replace(/^:/, "")} style={styleOf("GOLD")} />
        <span className="status-field status-hp" style={styleOf("HP")}>
          <span className="status-label">HP:</span>
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
        <Field
          label="Pw"
          value={`${text(status, "ENE")}(${text(status, "ENEMAX")})`}
          style={styleOf("ENE")}
        />
        {stat("AC", "AC")}
        {stat("HD", "HD")}
        <Field label="Xp" value={experience} style={styleOf("XP")} />
        {stat("T", "TIME")}
        <Field
          value={text(status, "HUNGER")}
          className="status-warning"
          style={styleOf("HUNGER")}
        />
        <Field value={text(status, "CAP")} className="status-warning" style={styleOf("CAP")} />
        {conditions.map((condition) => (
          <Field
            key={condition.label}
            value={condition.label}
            className="status-condition"
            style={condition.style}
          />
        ))}
      </div>
    </footer>
  );
}
