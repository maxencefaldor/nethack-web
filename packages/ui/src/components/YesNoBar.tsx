import type { EngineRequest } from "@nethack-web/protocol";
import { useSession } from "../context.js";
import { promptChoices } from "../prompt-choices.js";

type YesNoRequest = Extract<EngineRequest, { type: "yesNo" }>;

/**
 * A yes/no style question. Its choices are buttons, so it can be answered
 * by pointing; the keyboard hook handles typed keys. A prompt that accepts
 * any key without naming one gets a single-key field instead, which is what
 * summons the keyboard on a touch device.
 */
export function YesNoBar({ request }: { request: YesNoRequest }) {
  const session = useSession();
  const choices = promptChoices(request);
  return (
    <fieldset className="prompt">
      <legend className="prompt-label">{request.question}</legend>
      {choices.length === 0 ? (
        <input
          className="prompt-input prompt-key"
          aria-label="Key"
          maxLength={1}
          autoComplete="off"
          onChange={(event) => {
            if (event.target.value !== "") session.answer("yesNo", { answer: event.target.value });
          }}
        />
      ) : (
        choices.map((choice) => (
          <button
            key={choice}
            type="button"
            className={`choice${choice === request.defaultChoice ? " choice-default" : ""}`}
            onClick={() => session.answer("yesNo", { answer: choice })}
          >
            {choice}
          </button>
        ))
      )}
    </fieldset>
  );
}
