import React from "react";
import { cn } from "@/lib/cn";

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, error, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "w-full rounded-[var(--radius-control)] border px-3.5 py-2 text-small",
          "bg-[var(--color-surface-2)] text-[var(--color-text)]",
          "placeholder:text-[var(--color-faint)]",
          "outline-none transition-colors duration-[var(--dur-fast)]",
          "focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]",
          error
            ? "border-red-500/60"
            : "border-[var(--hairline)] hover:border-[var(--hairline-strong)]",
          "disabled:opacity-50 disabled:cursor-not-allowed resize-y",
          className
        )}
        {...props}
      />
    );
  }
);
TextArea.displayName = "TextArea";
