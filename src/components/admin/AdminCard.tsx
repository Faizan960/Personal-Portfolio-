/**
 * AdminCard
 * A stat card or content card for the admin dashboard.
 */

import { cn } from "@/lib/cn";

interface AdminCardProps {
  /** Short numeric or text value. */
  value: string | number;
  label: string;
  /** Optional descriptor shown below the label. */
  description?: string;
  iconPath?: string;
  className?: string;
  /** Muted style for placeholder/unavailable stats. */
  pending?: boolean;
}

export function AdminCard({
  value,
  label,
  description,
  iconPath,
  className,
  pending = false,
}: AdminCardProps) {
  return (
    <div
      className={cn(
        "glass-2 glass-rim rounded-[var(--radius-panel)] p-5",
        "flex flex-col gap-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "font-mono text-micro uppercase tracking-[0.16em]",
            "text-[var(--color-subtle)]",
          )}
        >
          {label}
        </p>

        {iconPath && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 shrink-0 text-[var(--color-faint)]"
            aria-hidden="true"
          >
            <path d={iconPath} />
          </svg>
        )}
      </div>

      <p
        className={cn(
          "font-mono text-h3 font-medium leading-none",
          pending
            ? "text-[var(--color-faint)]"
            : "text-[var(--color-text)]",
        )}
      >
        {pending ? "—" : value}
      </p>

      {description && (
        <p className="text-micro text-[var(--color-subtle)]">{description}</p>
      )}
    </div>
  );
}
