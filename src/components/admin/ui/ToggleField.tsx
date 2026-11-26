import React from "react";
import { cn } from "@/lib/cn";

export interface ToggleFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
  disabled,
  className,
}: ToggleFieldProps) {
  return (
    <label
      className={cn(
        "flex items-start justify-between gap-4 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div>
        <p className="text-small font-medium text-[var(--color-text)]">{label}</p>
        {description && (
          <p className="text-micro text-[var(--color-subtle)]">{description}</p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
          "transition-colors duration-[var(--dur-fast)] ease-in-out focus:outline-none",
          "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-void)]",
          checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-surface-3)]"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block size-5 rounded-full bg-[var(--color-text)] shadow-sm",
            "transform transition duration-[var(--dur-fast)] ease-in-out",
            checked ? "translate-x-5 bg-[var(--color-void)]" : "translate-x-0"
          )}
        />
      </button>
    </label>
  );
}
