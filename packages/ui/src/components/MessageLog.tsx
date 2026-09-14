import { useGame } from "../context.js";

const VISIBLE = 4;

/** The most recent messages, newest last, with the engine's --More-- pause when it asks for one. */
export function MessageLog() {
  const game = useGame();
  const waiting =
    game.request?.type === "displayWindowBlocking" &&
    game.windows[game.request.window]?.kind === "message";
  const recent = game.messages.slice(-VISIBLE);
  return (
    <section className="messages" aria-live="polite" aria-label="Messages">
      {recent.map((message, index) => (
        <p
          key={message.id}
          className={`message message-${message.attributes.style}${index === recent.length - 1 ? " message-latest" : ""}`}
        >
          {message.text}
        </p>
      ))}
      {waiting ? <span className="more">--More--</span> : null}
    </section>
  );
}
