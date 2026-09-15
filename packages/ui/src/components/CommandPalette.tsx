import { Command } from "cmdk";
import { useGame, useSession } from "../context.js";
import { Modal } from "./Modal.js";

/** Every extended command the engine build knows, searchable; Guided players discover the game here. */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const game = useGame();
  const session = useSession();
  const commands = (game.catalog?.extendedCommands ?? []).filter(
    (command) => command.description !== "",
  );
  const ready = game.request?.type === "getKeyOrPosition";
  const run = (name: string) => {
    session.runExtendedCommand(name);
    onClose();
  };
  return (
    <Modal title="Commands" hideTitle className="palette" onDismiss={onClose}>
      <Command label="Commands">
        <Command.Input className="palette-search" placeholder="Search commands" autoFocus />
        {ready ? null : <p className="palette-note">Finish the current prompt first.</p>}
        <Command.List className="palette-list">
          <Command.Empty className="panel-empty">No command matches.</Command.Empty>
          {commands.map((command) => (
            <Command.Item
              key={command.name}
              value={`${command.name} ${command.description}`}
              disabled={!ready}
              onSelect={() => run(command.name)}
            >
              <span className="completion-name">#{command.name}</span>
              {command.key > 32 && command.key < 127 ? (
                <kbd className="palette-key">{String.fromCharCode(command.key)}</kbd>
              ) : null}
              <span className="completion-description">{command.description}</span>
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </Modal>
  );
}
