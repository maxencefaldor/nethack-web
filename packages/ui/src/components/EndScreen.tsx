import { useGame } from "../context.js";
import { Modal } from "./Modal.js";

/** The end of a game, told by the engine's own dump log. */
export function EndScreen() {
  const game = useGame();
  const report = game.exitReport;
  return (
    <Modal title="The game has ended" hideTitle={report !== null} className="end-screen">
      {report === null ? (
        <p>{game.messages.at(-1)?.text ?? ""}</p>
      ) : (
        <pre className="end-report">{report}</pre>
      )}
      <footer className="dialog-actions">
        <button type="button" className="primary" onClick={() => location.reload()}>
          Title screen
        </button>
      </footer>
    </Modal>
  );
}
