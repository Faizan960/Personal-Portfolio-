"use client";

/**
 * Small pill used for skills and technology lists. Purely presentational —
 * the visual weight comes from the material, not from layout shifts.
 */

import { cn } from "@/lib/cn";

export interface ChipProps {
  label: string;
  className?: string;
}

export function Chip({ label, className }: ChipProps) {
  return (
    <li
      className={cn(
        "glass-1 rounded-chip px-3 py-1.5 text-small text-muted",
        "inline-flex items-center transition-colors duration-[var(--dur-base)]",
        "hover:text-text",
        className,
      )}
    >
      {label}
    </li>
  );
}
