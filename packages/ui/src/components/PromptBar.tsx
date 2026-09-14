import type { EngineRequest } from "@nethack-web/protocol";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGame, useSession } from "../context.js";

type LineRequest = Extract<EngineRequest, { type: "getLine" | "askName" | "getExtendedCommand" }>;

function label(request: LineRequest): string {
  switch (request.type) {
    case "askName":
      return "Who are you?";
    case "getExtendedCommand":
      return "#";
    case "getLine":
      return request.question;
  }
}

/** A single-line text prompt: names, free text, and extended commands with completion. */
export function PromptBar({ request }: { request: LineRequest }) {
  const session = useSession();
  const game = useGame();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const commands = game.catalog?.extendedCommands ?? [];
  const matches = useMemo(
    () =>
      request.type === "getExtendedCommand"
        ? commands.filter((command) => command.name.startsWith(value)).slice(0, 8)
        : [],
    [commands, request.type, value],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (text: string) => {
    switch (request.type) {
      case "askName":
        session.answer("askName", { name: text.trim() || "Adventurer" });
        return;
      case "getLine":
        session.answer("getLine", { text });
        return;
      case "getExtendedCommand": {
        const command = commands.find((candidate) => candidate.name === text) ?? matches[0];
        if (command === undefined) session.answer("getExtendedCommand", { cancelled: true });
        else session.answer("getExtendedCommand", { index: command.index });
        return;
      }
    }
  };

  const cancel = () => {
    if (request.type === "askName") return;
    if (request.type === "getLine") session.answer("getLine", { cancelled: true });
    else session.answer("getExtendedCommand", { cancelled: true });
  };

  return (
    <form
      className="prompt"
      onSubmit={(event) => {
        event.preventDefault();
        submit(value);
      }}
    >
      <label className="prompt-label" htmlFor="prompt-input">
        {label(request)}
      </label>
      <input
        id="prompt-input"
        ref={inputRef}
        className="prompt-input"
        value={value}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          } else if (event.key === "Tab" && matches[0]) {
            event.preventDefault();
            setValue(matches[0].name);
          }
        }}
      />
      {matches.length > 0 ? (
        <ul className="prompt-completions">
          {matches.map((command) => (
            <li key={command.name}>
              <button type="button" onClick={() => submit(command.name)}>
                <span className="completion-name">{command.name}</span>
                <span className="completion-description">{command.description}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
