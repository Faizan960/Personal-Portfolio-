import React from "react";
import { cn } from "@/lib/cn";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  required,
  helperText,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="block text-small font-medium text-[var(--color-text)]"
        >
          {label}
          {required && (
            <span className="ml-1 text-[var(--color-accent-warm)]" aria-hidden="true">
              *
            </span>
          )}
        </label>
      </div>

      {children}

      {helperText && !error && (
        <p className="text-micro text-[var(--color-subtle)]">{helperText}</p>
      )}

      {error && (
        <p role="alert" className="text-micro text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
