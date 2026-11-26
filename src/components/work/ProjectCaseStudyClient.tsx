"use client";

import React from "react";
import Link from "next/link";
import { usePublicPortfolio } from "@/lib/portfolio/publicContext";
import type { MutableProject } from "@/lib/cms/types";
import { Chip } from "@/components/primitives/Chip";
import { GlassPanel } from "@/components/primitives/GlassPanel";
import { Reveal } from "@/components/primitives/Reveal";
import { Section } from "@/components/primitives/Section";
import { cn } from "@/lib/cn";
import {
  isExternalHref,
  presentRepository,
  statusIsActive,
  statusLabel,
} from "@/lib/project";

const HEADING_ID = "case-study-heading";
const RESERVED_HEADING_ID = "case-study-reserved-heading";
const BACK_LABEL = "Selected Work";
const OVERVIEW_LABEL = "Overview";
const TECH_LABEL = "Stack";
const RESERVED_HEADING = "Reserved for documentation";
const RESERVED_NOTE =
  "These sections are part of the planned case study and will be written up as the project develops. Nothing is documented here until it is confirmed.";
const RESERVED_MARK = "Not yet documented";

type SectionBody =
  | { kind: "prose"; text: string }
  | { kind: "list"; items: readonly string[] }
  | { kind: "reserved" };

interface DetailSection {
  label: string;
  body: SectionBody;
}

function prose(text: string | null): SectionBody {
  return text !== null ? { kind: "prose", text } : { kind: "reserved" };
}

function reserved(project: MutableProject, label: string): SectionBody {
  const row = project.detail.reservedSections.find(
    (entry) => entry.label === label,
  );
  return row !== undefined && row.body !== null
    ? { kind: "prose", text: row.body }
    : { kind: "reserved" };
}

function list(
  items: readonly string[],
  project: MutableProject,
  reservedLabel?: string,
): SectionBody {
  if (items.length > 0) return { kind: "list", items };
  return reservedLabel !== undefined
    ? reserved(project, reservedLabel)
    : { kind: "reserved" };
}

const SECTION_ORDER: readonly {
  label: string;
  resolve: (project: MutableProject) => SectionBody;
}[] = [
  {
    label: OVERVIEW_LABEL,
    resolve: (project) => ({ kind: "prose", text: project.summary }),
  },
  { label: "Problem", resolve: (p) => prose(p.detail.problem) },
  { label: "Concept", resolve: (p) => prose(p.detail.solution) },
  { label: "AI Component", resolve: (p) => reserved(p, "AI Component") },
  { label: "Technology", resolve: (p) => list(p.tech, p, "Technology Stack") },
  {
    label: "Architecture",
    resolve: (p) => list(p.detail.architecture, p, "Offline Architecture"),
  },
  { label: "Data Flow", resolve: (p) => reserved(p, "Data Flow") },
  {
    label: "Key Features",
    resolve: (p) => list(p.detail.features, p, "Key Features"),
  },
  { label: "Current Focus", resolve: (p) => prose(p.detail.contribution) },
  { label: "Research Basis", resolve: (p) => reserved(p, "Research Basis") },
  {
    label: "Challenges",
    resolve: (p) => list(p.detail.challenges, p, "Challenges"),
  },
  {
    label: "Future Scope",
    resolve: (p) => list(p.detail.futureScope, p, "Future Scope"),
  },
];

const OPTIONAL_SECTIONS: readonly {
  label: string;
  resolve: (project: MutableProject) => SectionBody;
}[] = [{ label: "What I Learned", resolve: (p) => list(p.detail.lessons, p) }];

export function ProjectCaseStudyClient({
  slug,
  fallbackProject,
}: {
  slug: string;
  fallbackProject?: MutableProject;
}) {
  const { draft, isPreviewMode } = usePublicPortfolio();
  const matched = draft.projects.find(
    (p) => p.id === slug && (isPreviewMode || p.isPublished !== false),
  );
  const project = matched ?? fallbackProject ?? null;

  if (!project) {
    return (
      <Section id="case-study" labelledBy={HEADING_ID}>
        <div className="space-y-4">
          <Link
            href="/#work"
            className="inline-flex min-h-11 items-center gap-2 text-small text-muted hover:text-text"
          >
            ← {BACK_LABEL}
          </Link>
          <h1 id={HEADING_ID} className="text-h2 text-text">
            Project Not Found
          </h1>
          <p className="text-body text-muted">
            This project case study is either unpublished or no longer available.
          </p>
        </div>
      </Section>
    );
  }

  const typedProject = project as Parameters<typeof presentRepository>[0];
  const status = statusLabel(typedProject);
  const active = statusIsActive(typedProject);
  const repo = presentRepository(typedProject);

  const resolved: DetailSection[] = [
    ...SECTION_ORDER.map(({ label, resolve }) => ({
      label,
      body: resolve(project),
    })),
    ...OPTIONAL_SECTIONS.map(({ label, resolve }) => ({
      label,
      body: resolve(project),
    })).filter((section) => section.body.kind !== "reserved"),
  ];

  const documented = resolved.filter((s) => s.body.kind !== "reserved");
  const reservedLabels = resolved
    .filter((s) => s.body.kind === "reserved")
    .map((s) => s.label);

  return (
    <Section id="case-study" labelledBy={HEADING_ID}>
      <article>
        <Reveal>
          <Link
            href="/#work"
            className={cn(
              "group inline-flex min-h-11 items-center gap-2 text-small text-muted",
              "transition-colors duration-[var(--dur-base)] ease-[var(--ease-spatial)]",
              "hover:text-text",
            )}
          >
            <span
              aria-hidden="true"
              className="text-subtle transition-transform duration-[var(--dur-base)] ease-[var(--ease-spatial)] group-hover:-translate-x-0.5"
            >
              ←
            </span>
            {BACK_LABEL}
          </Link>
        </Reveal>

        <Reveal as="header" delay={60} className="mt-8 md:mt-10">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <span aria-hidden="true" className="font-mono text-small text-faint">
              {project.index}
            </span>

            {status !== null ? (
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    active
                      ? "bg-live motion-safe:animate-pulse-dot"
                      : "bg-faint",
                  )}
                />
                <span
                  className={cn(
                    "font-mono text-micro uppercase tracking-[0.16em]",
                    active ? "text-live" : "text-subtle",
                  )}
                >
                  {status}
                </span>
              </span>
            ) : null}

            <span
              aria-hidden="true"
              className="hairline-x hidden flex-1 sm:block"
            />
          </div>

          <h1
            id={HEADING_ID}
            className="measure-tight text-h2 mt-6 text-text md:mt-8"
          >
            {project.name}
          </h1>

          {project.fullTitle !== null ? (
            <p className="measure text-h3 mt-4 text-muted">
              {project.fullTitle}
            </p>
          ) : null}

          <p className="kicker mt-6 md:mt-8">{project.category}</p>
        </Reveal>

        {project.tech.length > 0 || repo.kind !== "none" || project.liveUrl ? (
          <Reveal delay={120} className="mt-10 md:mt-12">
            <span aria-hidden="true" className="hairline-x block" />

            <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-6">
              {project.tech.length > 0 ? (
                <div>
                  <p id="case-study-stack" className="kicker kicker-muted">
                    {TECH_LABEL}
                  </p>
                  <ul
                    aria-labelledby="case-study-stack"
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    {project.tech.map((technology) => (
                      <Chip
                        key={technology}
                        label={technology}
                        className="py-2"
                      />
                    ))}
                  </ul>
                </div>
              ) : null}

              {project.liveUrl ? (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 text-small text-accent hover:underline"
                >
                  Live Site ↗
                </a>
              ) : null}

              {repo.kind === "link" ? (
                <a
                  href={repo.href}
                  aria-label={`${repo.label}: ${project.name}`}
                  {...(isExternalHref(repo.href)
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="group inline-flex min-h-11 items-center gap-2 text-small text-muted hover:text-text"
                >
                  {repo.label}
                  <span aria-hidden="true">↗</span>
                </a>
              ) : null}

              {repo.kind === "label" ? (
                <span className="glass-well inline-flex min-h-11 items-center rounded-control px-4">
                  <span className="font-mono text-micro uppercase tracking-[0.16em] text-subtle">
                    {repo.label}
                  </span>
                </span>
              ) : null}
            </div>
          </Reveal>
        ) : null}

        {project.detail.screenshots.length > 0 && (
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {project.detail.screenshots.map((shot, idx) => (
              <figure
                key={`${shot.src}-${idx}`}
                className="overflow-hidden rounded-card border border-[var(--hairline)] bg-[var(--color-surface-1)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shot.src}
                  alt={shot.alt || `${project.name} screenshot`}
                  className="w-full h-auto object-cover"
                />
                {shot.alt && (
                  <figcaption className="px-4 py-2 text-micro text-subtle">
                    {shot.alt}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

        {documented.length > 0 ? (
          <div className="mt-16 space-y-12 md:mt-20 md:space-y-16">
            {documented.map((section, index) => (
              <Reveal key={section.label} delay={Math.min(index * 60, 300)} shift={16}>
                <div className="flex items-baseline gap-4">
                  <h2 className="kicker">{section.label}</h2>
                  <span aria-hidden="true" className="hairline-x flex-1" />
                </div>

                {section.body.kind === "prose" ? (
                  <p className="measure text-body mt-5 text-muted">
                    {section.body.text}
                  </p>
                ) : null}

                {section.body.kind === "list" ? (
                  <ul className="mt-5 space-y-2.5">
                    {section.body.items.map((item) => (
                      <li
                        key={item}
                        className="measure text-body relative pl-5 text-muted"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-[0.72em] size-1 rounded-full bg-faint"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Reveal>
            ))}
          </div>
        ) : null}

        {reservedLabels.length > 0 ? (
          <Reveal shift={16} className="mt-16 md:mt-20">
            <GlassPanel
              as="section"
              level={2}
              rim
              aria-labelledby={RESERVED_HEADING_ID}
              className="rounded-card p-6 sm:p-8 md:p-10"
            >
              <h2
                id={RESERVED_HEADING_ID}
                className="measure-tight text-h3 text-text"
              >
                {RESERVED_HEADING}
              </h2>
              <p className="measure text-small mt-3 text-muted">
                {RESERVED_NOTE}
              </p>

              <ul className="mt-8 md:mt-10">
                {reservedLabels.map((label, index) => (
                  <li
                    key={label}
                    className={cn(
                      "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4",
                      "border-[var(--hairline-faint)]",
                      index > 0 && "border-t",
                    )}
                  >
                    <span className="text-small text-text [overflow-wrap:anywhere]">
                      {label}
                    </span>
                    <span className="font-mono text-micro uppercase tracking-[0.16em] text-faint">
                      {RESERVED_MARK}
                    </span>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          </Reveal>
        ) : null}
      </article>
    </Section>
  );
}
