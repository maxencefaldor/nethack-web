import type { LucideIcon } from "lucide-react";
import { Tooltip } from "radix-ui";

export interface IconButtonProps {
  readonly icon: LucideIcon;
  /** Accessible name and tooltip. */
  readonly label: string;
  readonly onClick: () => void;
  readonly pressed?: boolean | undefined;
}

/** A square icon-only control with a tooltip; pressed state is exposed to assistive technology only. */
export function IconButton({ icon: Icon, label, onClick, pressed }: IconButtonProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          className="icon-button"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
        >
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" sideOffset={6}>
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
