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
  readonly children: ReactNode;
}

/** A modal over the game on Radix Dialog: portal, focus trap, labelling and layering come from it. */
export function Modal({ title, hideTitle, className, onDismiss, children }: ModalProps) {
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
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
