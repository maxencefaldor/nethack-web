import { useEffect, useRef } from "react";
import { useGame, useSession } from "../context.js";
import { Overlay } from "./Overlay.js";

/** Every message of the game so far, shown while the engine waits on its previous-message command. */
export function MessageHistoryDialog() {
  const game = useGame();
  const session = useSession();
  const endRef = useRef<HTMLLIElement>(null);
  const dismiss = () => session.answer("previousMessage", { done: true });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    const listener = (event: KeyboardEvent) => {
      event.preventDefault();
      dismiss();
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  });

  return (
    <Overlay label="Message history" className="history" onDismiss={dismiss}>
      <h2 className="dialog-title">Messages</h2>
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
      <footer className="dialog-actions">
        <button type="button" className="primary" onClick={dismiss}>
          Close
        </button>
      </footer>
    </Overlay>
  );
}
