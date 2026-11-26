"use client";

import React from "react";
import Link from "next/link";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { AdminCard } from "@/components/admin/AdminCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/ui/SaveIndicator";
import { cn } from "@/lib/cn";

const QUICK_ACTIONS = [
  {
    label: "Edit Homepage Sections",
    href: "/admin/homepage/",
    iconPath:
      "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  },
  {
    label: "Manage Projects",
    href: "/admin/projects/",
    iconPath:
      "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5",
  },
  {
    label: "Tech City Studio",
    href: "/admin/tech-city/",
    iconPath:
      "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75",
  },
  {
    label: "Website Preview",
    href: "/admin/preview/",
    iconPath:
      "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    label: "Review & Publish Changes",
    href: "/admin/publishing/",
    iconPath:
      "M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z",
  },
] as const;

export default function DashboardPage() {
  const {
    draft,
    publishedDraft,
    isHydrated,
    isSaving,
    lastSaved,
    persistenceSource,
    hasUnpublishedChanges,
    unpublishedSections,
    hasLocalBackup,
    localBackupDiffCount,
    adminUser,
    isAdminVerified,
    publicationHistory,
  } = usePortfolioDraft();
  const supabaseConfigured = isSupabaseConfigured();

  const publishedProjectsCount = draft.projects.filter(
    (p) => p.isPublished !== false,
  ).length;
  const publicRepoCount = draft.projects.filter((p) => p.visibility === "public").length;
  const totalSkillsCount = draft.skills.reduce((acc, s) => acc + s.items.length, 0);
  const techCount = draft.technologies?.length ?? 0;
  const mediaCount = draft.media?.length ?? 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Overview"
        description="Complete health summary of your portfolio website, Tech City visualization, and publication state."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
            <Link
              href="/admin/preview/"
              className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-3.5 py-2 text-small text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors"
            >
              Preview Site
            </Link>
            <Link
              href="/admin/publishing/"
              className={cn(
                "rounded-[var(--radius-control)] px-4 py-2 text-small font-medium transition-opacity",
                hasUnpublishedChanges
                  ? "bg-amber-400 text-slate-950 hover:opacity-90"
                  : "bg-[var(--color-accent)] text-[var(--color-void)] hover:opacity-90",
              )}
            >
              {hasUnpublishedChanges ? "Publish Changes" : "Publishing Center"}
            </Link>
          </div>
        }
      />

      {/* Alert Banners */}
      {hasUnpublishedChanges && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-panel)] border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-small text-amber-200">
          <div>
            <p className="font-medium text-amber-100">
              Saved changes are waiting to be published ({unpublishedSections.length} section
              {unpublishedSections.length === 1 ? "" : "s"})
            </p>
            <p className="text-micro text-amber-200/80 mt-0.5">
              Modified areas: {unpublishedSections.join(", ")}. Visitors still see{" "}
              {publishedDraft?.publicationMeta?.version
                ? `Published Version v${publishedDraft.publicationMeta.version}`
                : "the last published version"}
              .
            </p>
          </div>
          <Link
            href="/admin/publishing/"
            className="rounded-[var(--radius-control)] bg-amber-400 px-3.5 py-1.5 text-micro font-semibold text-slate-950 hover:opacity-90"
          >
            Review &amp; Publish
          </Link>
        </div>
      )}

      {hasLocalBackup && localBackupDiffCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-panel)] border border-[var(--color-accent)]/35 bg-[var(--color-accent)]/10 px-4 py-3 text-small text-[var(--color-text)]">
          <div>
            <p className="font-medium">
              Local browser edits detected ({localBackupDiffCount} difference
              {localBackupDiffCount === 1 ? "" : "s"} vs database)
            </p>
            <p className="text-micro text-[var(--color-muted)] mt-0.5">
              Review and import your local edits or keep the database version in the Reconciliation Center.
            </p>
          </div>
          <Link
            href="/admin/publishing/#reconciliation"
            className="rounded-[var(--radius-control)] border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 px-3.5 py-1.5 text-micro font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25"
          >
            Open Reconciliation
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <section aria-labelledby="stats-heading" className="space-y-3">
        <h2
          id="stats-heading"
          className="font-mono text-micro uppercase tracking-[0.16em] text-[var(--color-subtle)]"
        >
          Workspace Summary
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <AdminCard
            label="Projects"
            value={draft.projects.length}
            description={`${publishedProjectsCount} published · ${publicRepoCount} public repos`}
            iconPath="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
          />
          <AdminCard
            label="Tech City Districts"
            value={draft.skills.length}
            description={`${totalSkillsCount} building towers`}
            iconPath="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21"
          />
          <AdminCard
            label="Project Landmarks"
            value={draft.projects.filter((p) => p.isPublished !== false).length}
            description="Floating orbital landmarks"
            iconPath="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3"
          />
          <AdminCard
            label="Technologies"
            value={techCount}
            description="Orbital tech nodes"
            iconPath="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
          />
          <AdminCard
            label="Experience"
            value={draft.experience.length}
            description="Career roles & internships"
            iconPath="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25"
          />
          <AdminCard
            label="Education"
            value={draft.education.length}
            description="Academic credentials"
            iconPath="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41"
          />
          <AdminCard
            label="Recognition"
            value={draft.certifications.length + draft.achievements.length}
            description={`${draft.certifications.length} certs · ${draft.achievements.length} awards`}
            iconPath="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871"
          />
          <AdminCard
            label="Media Assets"
            value={mediaCount}
            description="Uploaded images & resumes"
            iconPath="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 20.25h16.5"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick actions */}
        <section aria-labelledby="actions-heading">
          <h2
            id="actions-heading"
            className="mb-3 font-mono text-micro uppercase tracking-[0.16em] text-[var(--color-subtle)]"
          >
            Quick Actions
          </h2>
          <div className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)]">
            <ul role="list">
              {QUICK_ACTIONS.map((action, i) => (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-small",
                      "text-[var(--color-muted)] hover:text-[var(--color-text)]",
                      "transition-colors duration-[var(--dur-fast)]",
                      "hover:bg-[var(--color-surface-2)]",
                      i === 0 && "rounded-t-[var(--radius-panel)]",
                      i === QUICK_ACTIONS.length - 1 && "rounded-b-[var(--radius-panel)]",
                    )}
                  >
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
                      <path d={action.iconPath} />
                    </svg>
                    {action.label}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="ml-auto size-3 text-[var(--color-faint)]"
                      aria-hidden="true"
                    >
                      <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                  {i < QUICK_ACTIONS.length - 1 && (
                    <div className="hairline-x mx-4" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* System Status & Publication History */}
        <section aria-labelledby="status-heading" className="space-y-4">
          <h2
            id="status-heading"
            className="font-mono text-micro uppercase tracking-[0.16em] text-[var(--color-subtle)]"
          >
            Live System &amp; Publication Status
          </h2>
          <div className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-4 space-y-3.5">
            <StatusRow
              label="Database Sync"
              status={persistenceSource === "supabase" ? "online" : "offline"}
              note={
                persistenceSource === "supabase"
                  ? "Connected to Supabase"
                  : supabaseConfigured
                  ? "Fallback active (check sign-in)"
                  : "Local mode"
              }
            />
            <StatusRow
              label="Admin Account"
              status={isAdminVerified ? "online" : "offline"}
              note={
                isAdminVerified && adminUser
                  ? adminUser.email
                  : supabaseConfigured
                  ? "Sign-in required"
                  : "Local developer access"
              }
            />
            <StatusRow
              label="Live Public Snapshot"
              status={publishedDraft?.publicationMeta?.version ? "online" : "offline"}
              note={
                publishedDraft?.publicationMeta?.version
                  ? `v${publishedDraft.publicationMeta.version}`
                  : "Using fallback snapshot"
              }
            />
            <StatusRow
              label="Draft State"
              status={hasUnpublishedChanges ? "offline" : "online"}
              note={
                hasUnpublishedChanges
                  ? `${unpublishedSections.length} unpublished section(s)`
                  : "All changes published"
              }
            />
          </div>

          <div className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="font-mono text-micro uppercase tracking-[0.14em] text-[var(--color-subtle)]">
                Recent Publishing Activity
              </p>
              <Link
                href="/admin/publishing/"
                className="text-micro text-[var(--color-accent)] hover:underline"
              >
                Full History
              </Link>
            </div>
            {publicationHistory.length > 0 ? (
              <ul className="space-y-2">
                {publicationHistory.slice(0, 3).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between text-micro text-[var(--color-muted)] border-t border-[var(--hairline-faint)] pt-2 first:border-t-0 first:pt-0"
                  >
                    <span>
                      v{item.version} · {item.action}
                      {item.summary ? ` — ${item.summary}` : ""}
                    </span>
                    <span className="font-mono text-[var(--color-faint)]">
                      {new Date(item.publishedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-micro text-[var(--color-subtle)]">
                Last workspace edit recorded at{" "}
                {isHydrated ? new Date(draft.lastModified).toLocaleString() : "—"}.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  status,
  note,
}: {
  label: string;
  status: "online" | "offline";
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-small text-[var(--color-muted)]">{label}</span>
      <div className="flex items-center gap-2">
        {note && (
          <span className="font-mono text-micro text-[var(--color-faint)]">
            {note}
          </span>
        )}
        <span
          aria-label={status}
          className={cn(
            "size-2 shrink-0 rounded-full",
            status === "online" ? "bg-[var(--color-live)]" : "bg-amber-400",
          )}
        />
      </div>
    </div>
  );
}
