import type { ReactNode } from "react";

export interface OverlayProps {
  readonly label: string;
  readonly className?: string | undefined;
  /** Called when the player clicks outside the dialog; omit to make the overlay modal. */
  readonly onDismiss?: (() => void) | undefined;
  readonly children: ReactNode;
}

/** A dialog over the game, with an optional click-outside dismissal that is a real button. */
export function Overlay({ label, className, onDismiss, children }: OverlayProps) {
  return (
    <div className="dialog-backdrop">
      {onDismiss ? (
        <button
          type="button"
          className="backdrop-dismiss"
          aria-label="Dismiss"
          onClick={onDismiss}
        />
      ) : null}
      <dialog className={`dialog${className ? ` ${className}` : ""}`} open aria-label={label}>
        {children}
      </dialog>
    </div>
  );
}
