import { useEffect, useRef } from "react";
import { useGame, useSession } from "../context.js";
import { Modal } from "./Modal.js";

/** Every message of the game so far, shown while the engine waits on its previous-message command. */
export function MessageHistoryDialog() {
  const game = useGame();
  const session = useSession();
  const endRef = useRef<HTMLLIElement>(null);
  const dismiss = () => session.answer("previousMessage", { done: true });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, []);

  return (
    <Modal
      title="Messages"
      className="history"
      onDismiss={dismiss}
      actions={
        <button type="button" className="primary" onClick={dismiss}>
          Close
        </button>
      }
    >
      <ol className="history-list">
        {game.messages.map((message, index) => (
          <li
            key={message.id}
            ref={index === game.messages.length - 1 ? endRef : undefined}
            className={`message message-${message.attributes.style}`}
          >
            {message.turn === null ? null : <span className="history-turn">T:{message.turn}</span>}
            {message.text}
          </li>
        ))}
      </ol>
    </Modal>
  );
}
