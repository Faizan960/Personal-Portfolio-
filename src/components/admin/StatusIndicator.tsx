/**
 * StatusIndicator
 * Dot + label for connection / system status.
 */

import { cn } from "@/lib/cn";

type StatusVariant = "online" | "offline" | "pending" | "warning";

interface StatusIndicatorProps {
  variant: StatusVariant;
  label: string;
  className?: string;
}

const VARIANT_STYLES: Record<StatusVariant, string> = {
  online: "bg-[var(--color-live)]",
  offline: "bg-[var(--color-faint)]",
  pending: "bg-[var(--color-accent-warm)]",
  warning: "bg-amber-500",
};

export function StatusIndicator({
  variant,
  label,
  className,
}: StatusIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          VARIANT_STYLES[variant],
        )}
      />
      <span className="font-mono text-micro uppercase tracking-[0.12em] text-[var(--color-subtle)]">
        {label}
      </span>
    </span>
  );
}
