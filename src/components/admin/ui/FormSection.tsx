import React from "react";
import { cn } from "@/lib/cn";

export interface FormSectionProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  action,
  children,
  className,
}: FormSectionProps) {
  return (
    <div
      className={cn(
        "glass-2 rounded-[var(--radius-panel)] p-5 sm:p-6 space-y-5 border border-[var(--hairline)]",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--hairline-faint)] pb-4">
        <div>
          <h2 className="text-h4 font-medium text-[var(--color-text)]">{title}</h2>
          {description && (
            <p className="mt-0.5 text-small text-[var(--color-muted)]">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="space-y-4">{children}</div>
    </div>
  );
}
