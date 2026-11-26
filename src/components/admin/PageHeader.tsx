/**
 * PageHeader
 * Standard top-of-page heading for admin content pages.
 */

import { cn } from "@/lib/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional action button/link rendered on the right. */
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        className,
      )}
    >
      <div>
        <h1 className="text-h3 font-medium text-[var(--color-text)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-small text-[var(--color-muted)]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
