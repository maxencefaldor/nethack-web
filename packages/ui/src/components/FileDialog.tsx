import type { EngineRequest } from "@nethack-web/protocol";
import { useEffect } from "react";
import { useSession } from "../context.js";
import { Overlay } from "./Overlay.js";

type FileRequest = Extract<EngineRequest, { type: "displayFile" }>;

/** A help or information file from the engine's data library, shown until dismissed. */
export function FileDialog({ request }: { request: FileRequest }) {
  const session = useSession();
  const dismiss = () => session.answer("displayFile", { dismissed: true });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      event.preventDefault();
      dismiss();
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  });

  return (
    <Overlay label={request.name} className="text-dialog" onDismiss={dismiss}>
      <pre className="text-lines">{request.text ?? `Cannot find file ${request.name}.`}</pre>
      <footer className="dialog-actions">
        <button type="button" className="primary" onClick={dismiss}>
          Continue
        </button>
      </footer>
    </Overlay>
  );
}
