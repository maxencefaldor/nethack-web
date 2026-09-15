import type { EngineRequest } from "@nethack-web/protocol";
import { useSession } from "../context.js";
import { Modal } from "./Modal.js";

type FileRequest = Extract<EngineRequest, { type: "displayFile" }>;

/** A help or information file from the engine's data library, shown until dismissed. */
export function FileDialog({ request }: { request: FileRequest }) {
  const session = useSession();
  const dismiss = () => session.answer("displayFile", { dismissed: true });
  return (
    <Modal
      title={request.name}
      hideTitle
      className="text-dialog"
      onDismiss={dismiss}
      actions={
        <button type="button" className="primary" onClick={dismiss}>
          Continue
        </button>
      }
    >
      <pre className="text-lines">{request.text ?? `Cannot find file ${request.name}.`}</pre>
    </Modal>
  );
}
