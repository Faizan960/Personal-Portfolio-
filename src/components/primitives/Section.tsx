/**
 * Semantic section shell. Owns the page's vertical rhythm and content column so
 * no individual section reinvents spacing.
 *
 * Server component — no hooks, no client JS.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SectionProps {
  /** Scroll-target id. Must match `navSections` in the data file where relevant. */
  id: string;
  children: ReactNode;
  /** id of the `<h2>` that names this section, for `aria-labelledby`. */
  labelledBy?: string;
  className?: string;
  /** Use the wider content column. */
  wide?: boolean;
}

export function Section({
  id,
  children,
  labelledBy,
  className,
  wide = false,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("section-y relative", className)}
    >
      <div className={cn("shell", wide && "shell-wide")}>{children}</div>
    </section>
  );
}
