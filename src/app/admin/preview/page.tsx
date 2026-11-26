"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import { getDefaultSectionsConfig } from "@/lib/cms/storage";
import { PageHeader } from "@/components/admin/PageHeader";

const TechCityPreview = dynamic(
  () => import("@/components/city/TechCity").then((m) => m.TechCity),
  { ssr: false },
);

export default function WebsitePreviewPage() {
  const { draft, hasUnpublishedChanges, unpublishedSections } =
    usePortfolioDraft();

  const sectionsConfig = draft.sectionsConfig ?? getDefaultSectionsConfig();
  const visibleSections = sectionsConfig.order
    .map((id) => sectionsConfig.sections[id])
    .filter((s) => Boolean(s) && (s.locked || s.visible));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Website Preview"
        description="Inspect how your unpublished workspace changes look across your homepage sections and 3D Tech City before publishing live."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/?preview=1"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-3.5 py-2 text-small text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
            >
              Open Full Public Preview ↗
            </a>
            <Link
              href="/admin/publishing/"
              className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90"
            >
              Review &amp; Publish Changes
            </Link>
          </div>
        }
      />

      <div className="rounded-[var(--radius-panel)] border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-small text-amber-100">
        {hasUnpublishedChanges ? (
          <span>
            Previewing unpublished draft updates across{" "}
            <strong>{unpublishedSections.join(", ")}</strong>. Public visitors still see the currently published version until you publish.
          </span>
        ) : (
          <span>
            Preview matches the currently published website snapshot.
          </span>
        )}
      </div>

      {/* Interactive Tech City Preview */}
      <section className="rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--color-surface-1)] overflow-hidden">
        <div className="border-b border-[var(--hairline-faint)] px-5 py-3 flex items-center justify-between">
          <span className="font-mono text-micro uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Live 3D Tech City Preview
          </span>
          <Link
            href="/admin/tech-city/"
            className="text-micro text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            Edit in Tech City Studio →
          </Link>
        </div>
        <div className="h-[420px] relative">
          <TechCityPreview
            draftOverride={draft}
            embeddedPreview
            includeUnpublished
          />
        </div>
      </section>

      {/* Section Order & Content Fidelity Summary */}
      <div className="space-y-4">
        {visibleSections.map((sec, idx) => (
          <div
            key={sec.id}
            className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-micro uppercase tracking-[0.16em] text-[var(--color-subtle)]">
                {String(idx + 1).padStart(2, "0")} · {sec.label}
              </span>
              {sec.headingOverride && (
                <span className="text-micro text-[var(--color-accent)]">
                  Custom heading: {sec.headingOverride}
                </span>
              )}
            </div>

            {sec.id === "hero" && (
              <div className="space-y-1.5">
                <p className="text-h3 font-medium text-[var(--color-text)]">
                  {draft.personal.name} — {draft.hero.kicker}
                </p>
                <p className="text-small text-[var(--color-muted)]">
                  {draft.personal.statement}
                </p>
              </div>
            )}

            {sec.id === "about" && (
              <div className="space-y-2">
                <p className="font-medium text-[var(--color-text)]">
                  {sec.headingOverride ?? draft.about.heading}
                </p>
                {draft.about.paragraphs.map((p, pIdx) => (
                  <p key={pIdx} className="text-small text-[var(--color-muted)]">
                    {p}
                  </p>
                ))}
              </div>
            )}

            {sec.id === "skills" && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {draft.skills
                  .filter((c) => c.isVisible !== false)
                  .map((cat) => (
                    <div
                      key={cat.id}
                      className="rounded border border-[var(--hairline-faint)] bg-[var(--color-surface-2)] p-3"
                    >
                      <p className="text-small font-medium text-[var(--color-text)]">
                        {cat.label}
                      </p>
                      <p className="text-micro text-[var(--color-subtle)] mt-1">
                        {cat.items.join(" · ")}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            {sec.id === "work" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {draft.projects
                  .filter((p) => p.isPublished !== false)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="rounded border border-[var(--hairline-faint)] bg-[var(--color-surface-2)] p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-small text-[var(--color-text)]">
                          {p.name}
                        </span>
                        <span className="font-mono text-micro text-[var(--color-subtle)]">
                          {p.visibility}
                        </span>
                      </div>
                      <p className="text-micro text-[var(--color-muted)]">
                        {p.summary}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            {sec.id === "experience" && (
              <div className="space-y-2">
                {draft.experience
                  .filter((e) => e.isVisible !== false)
                  .map((item) => (
                    <p key={item.id} className="text-small text-[var(--color-muted)]">
                      <strong className="text-[var(--color-text)]">{item.role}</strong> ·{" "}
                      {item.organisation} ({item.period})
                    </p>
                  ))}
              </div>
            )}

            {sec.id === "education" && (
              <div className="space-y-2">
                {draft.education
                  .filter((e) => e.isVisible !== false)
                  .map((item) => (
                    <p key={item.id} className="text-small text-[var(--color-muted)]">
                      <strong className="text-[var(--color-text)]">{item.award}</strong>{" "}
                      in {item.qualification}
                    </p>
                  ))}
              </div>
            )}

            {sec.id === "exploring" && (
              <p className="text-small text-[var(--color-muted)]">
                {draft.exploring
                  .filter((e) => e.isVisible !== false)
                  .map((e) => e.label)
                  .join(" · ")}
              </p>
            )}

            {sec.id === "recognition" && (
              <p className="text-small text-[var(--color-muted)]">
                {draft.certifications.length} certification(s) ·{" "}
                {draft.achievements.length} achievement(s)
              </p>
            )}

            {sec.id === "contact" && (
              <p className="text-small text-[var(--color-muted)]">
                {draft.contact.statement}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
