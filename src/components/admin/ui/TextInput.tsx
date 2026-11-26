import React from "react";
import { cn } from "@/lib/cn";

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-[var(--radius-control)] border px-3.5 py-2 text-small",
          "bg-[var(--color-surface-2)] text-[var(--color-text)]",
          "placeholder:text-[var(--color-faint)]",
          "outline-none transition-colors duration-[var(--dur-fast)]",
          "focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]",
          error
            ? "border-red-500/60"
            : "border-[var(--hairline)] hover:border-[var(--hairline-strong)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);
TextInput.displayName = "TextInput";
