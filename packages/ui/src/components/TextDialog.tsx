import type { WindowSnapshot } from "@nethack-web/state";
import { useSession } from "../context.js";
import { MenuEntries } from "./MenuEntries.js";
import { Modal } from "./Modal.js";

/** A text or menu window the engine wants shown until the player dismisses it. */
export function TextDialog({ window }: { window: WindowSnapshot }) {
  const session = useSession();
  const dismiss = () => session.answer("displayWindowBlocking", { dismissed: true });
  return (
    <Modal
      title="Text"
      hideTitle
      className="text-dialog"
      onDismiss={dismiss}
      actions={
        <button type="button" className="primary" onClick={dismiss}>
          Continue
        </button>
      }
    >
      {window.menu !== null && window.menu.entries.length > 0 ? (
        <MenuEntries menu={window.menu} />
      ) : (
        <pre className="text-lines">
          {window.lines.map((line, index) => (
            <span
              key={`${index}-${line.text}`}
              className={`text-line text-${line.attributes.style}`}
            >
              {line.text}
              {"\n"}
            </span>
          ))}
        </pre>
      )}
    </Modal>
  );
}
