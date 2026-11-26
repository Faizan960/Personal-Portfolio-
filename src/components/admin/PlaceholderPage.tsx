/**
 * Reusable placeholder page component for M1 admin content pages.
 * Each content section gets a correctly titled, honestly labelled stub.
 */

import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { cn } from "@/lib/cn";

interface PlaceholderPageProps {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  iconPath: string;
  /** Optional list of features planned for this section */
  plannedFeatures?: string[];
}

export function PlaceholderPage({
  title,
  description,
  emptyTitle,
  emptyDescription,
  iconPath,
  plannedFeatures,
}: PlaceholderPageProps) {
  return (
    <div className="p-6 lg:p-8">
      <PageHeader title={title} description={description} />

      {/* M1 banner */}
      <div
        className={cn(
          "mt-6 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-4",
          "bg-[var(--color-surface-2)] flex items-start gap-3",
        )}
        role="note"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 size-4 shrink-0 text-[var(--color-accent)]"
          aria-hidden="true"
        >
          <path d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <div>
          <p className="text-small font-medium text-[var(--color-text)]">
            Planned for Milestone 2 and beyond
          </p>
          <p className="mt-0.5 text-small text-[var(--color-muted)]">
            This section will support full content management once the Supabase
            database is connected. No data is stored or modified in M1.
          </p>
        </div>
      </div>

      {/* Empty state */}
      <div className="mt-6">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          note="M1 — UI shell only"
          iconPath={iconPath}
        />
      </div>

      {/* Planned features */}
      {plannedFeatures && plannedFeatures.length > 0 && (
        <section aria-labelledby="planned-heading" className="mt-6">
          <h2
            id="planned-heading"
            className="mb-3 font-mono text-micro uppercase tracking-[0.16em] text-[var(--color-subtle)]"
          >
            Planned Functionality
          </h2>
          <div className="glass-2 rounded-[var(--radius-panel)]">
            <ul role="list">
              {plannedFeatures.map((feature, i) => (
                <li
                  key={feature}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-small text-[var(--color-muted)]",
                    i > 0 && "border-t border-[var(--hairline-faint)]",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="size-1 shrink-0 rounded-full bg-[var(--color-faint)]"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
