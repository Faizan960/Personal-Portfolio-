/**
 * EmptyState
 * Displayed when a content page has no records yet.
 * Clearly labels M1 as a planning milestone — no fake data.
 */

import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  description: string;
  /** Optional additional note, e.g. milestone context. */
  note?: string;
  iconPath?: string;
  className?: string;
}

export function EmptyState({
  title,
  description,
  note,
  iconPath,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass-well flex flex-col items-center rounded-[var(--radius-card)] px-8 py-14 text-center",
        className,
      )}
    >
      {iconPath && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-4 size-10 text-[var(--color-faint)]"
          aria-hidden="true"
        >
          <path d={iconPath} />
        </svg>
      )}

      <p className="text-h4 font-medium text-[var(--color-text)]">{title}</p>
      <p className="measure-tight mt-2 text-small text-[var(--color-muted)]">
        {description}
      </p>

      {note && (
        <p
          className={cn(
            "mt-4 rounded-[var(--radius-chip)] px-3 py-1.5",
            "font-mono text-micro uppercase tracking-[0.12em]",
            "bg-[var(--color-surface-2)] text-[var(--color-subtle)]",
          )}
        >
          {note}
        </p>
      )}
    </div>
  );
}
