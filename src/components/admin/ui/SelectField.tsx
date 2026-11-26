import React from "react";
import { cn } from "@/lib/cn";

export interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: Array<{ value: string; label: string }>;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ className, error, options, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "w-full appearance-none rounded-[var(--radius-control)] border px-3.5 py-2 pr-9 text-small",
            "bg-[var(--color-surface-2)] text-[var(--color-text)]",
            "outline-none transition-colors duration-[var(--dur-fast)]",
            "focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]",
            error
              ? "border-red-500/60"
              : "border-[var(--hairline)] hover:border-[var(--hairline-strong)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-[var(--color-surface-1)] text-[var(--color-text)]"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]">
          <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    );
  }
);
SelectField.displayName = "SelectField";
