import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";

export interface ModalProps {
  /** Accessible name; shown as the heading unless `hideTitle` is set. */
  readonly title: string;
  readonly hideTitle?: boolean | undefined;
  readonly className?: string | undefined;
  /**
   * Called on Escape or a click outside. Omit for dialogs the game is waiting
   * on with their own key handling, which decide themselves how to close.
   */
  readonly onDismiss?: (() => void) | undefined;
  /** Buttons for the footer, which stays in view while the body scrolls. */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

/**
 * A modal over the game on Radix Dialog: portal, focus trap, labelling and
 * layering come from it. Dismissible dialogs show a close control, which on a
 * phone, where the dialog fills the screen, is the only way out besides the
 * footer.
 */
export function Modal({ title, hideTitle, className, onDismiss, actions, children }: ModalProps) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onDismiss?.()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-backdrop" />
        <Dialog.Content
          className={`modal${className ? ` ${className}` : ""}`}
          onEscapeKeyDown={(event) => onDismiss === undefined && event.preventDefault()}
          onPointerDownOutside={(event) => onDismiss === undefined && event.preventDefault()}
          onInteractOutside={(event) => onDismiss === undefined && event.preventDefault()}
        >
          <Dialog.Title className={hideTitle ? "visually-hidden" : "modal-title"}>
            {title}
          </Dialog.Title>
          <Dialog.Description className="visually-hidden">{title}</Dialog.Description>
          {onDismiss === undefined ? null : (
            <Dialog.Close className="modal-close" aria-label="Close">
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          )}
          <div className="modal-body">{children}</div>
          {actions === undefined ? null : <footer className="dialog-actions">{actions}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
