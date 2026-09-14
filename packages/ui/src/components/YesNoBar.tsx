import type { EngineRequest } from "@nethack-web/protocol";
import { useSession } from "../context.js";

type YesNoRequest = Extract<EngineRequest, { type: "yesNo" }>;

/** A yes/no style question with clickable choices; the keyboard hook handles keys. */
export function YesNoBar({ request }: { request: YesNoRequest }) {
  const session = useSession();
  const choices =
    request.choices === null ? [] : [...request.choices].filter((c) => c !== "\x1b" && c > " ");
  return (
    <fieldset className="prompt">
      <legend className="prompt-label">{request.question}</legend>
      {choices.map((choice) => (
        <button
          key={choice}
          type="button"
          className={`choice${choice === request.defaultChoice ? " choice-default" : ""}`}
          onClick={() => session.answer("yesNo", { answer: choice })}
        >
          {choice}
        </button>
      ))}
    </fieldset>
  );
}
