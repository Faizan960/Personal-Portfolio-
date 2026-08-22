/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PROJECT CASE STUDY — /work/[slug]/
 * ─────────────────────────────────────────────────────────────────────────────
 * A route exists only for a project whose `detail` actually holds something, and
 * `generateStaticParams` is derived from that same predicate. Three near-empty
 * case-study pages would read worse than no pages at all, so the Work section's
 * "View Project" action and this route are gated on one shared check — they can
 * never disagree about whether a page exists. Filling in any project's `detail`
 * publishes its page on the next build with no code change here.
 *
 * HOW AN UNWRITTEN SECTION IS PRESENTED
 * The case study is planned before it is written, and that outline is real
 * information: it says what will be documented. So the page renders in two
 * movements rather than padding empty headings with prose.
 *
 *   Documented   sections that have a body today. Full treatment — mono label,
 *                then prose or a bulleted list at reading measure.
 *   Reserved     sections with nothing behind them yet, collected into one
 *                compact outline at the foot of the page under a heading that
 *                says exactly that. Each row is a label and a state marker on a
 *                recess: no heading over blank space, no "coming soon" on a
 *                button, nothing focusable.
 *
 * `SECTION_ORDER` below is the page's single ordering table. A section graduates
 * from the reserved outline to a documented section the moment its data field is
 * filled in, and it lands in the position the table already assigns it — the
 * order does not shift as content arrives.
 *
 * CONTENT INTEGRITY
 * Nothing on this page is synthesised. Every string comes from `portfolio.ts`;
 * the only text authored here is structural — section labels, the back link, and
 * the wording of the reserved state.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  hasProjectDetail,
  meta as siteMeta,
  personal,
  projects,
  type Project,
} from "@/data/portfolio";
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

/* ── Static routes ─────────────────────────────────────────────────────────── */

/**
 * Only projects with real detail content get a page. Under `output: "export"`
 * this is the complete list of case studies in the build.
 */
export function generateStaticParams() {
  return projects
    .filter(hasProjectDetail)
    .map((project) => ({ slug: project.id }));
}

interface PageParams {
  /** Next 15 passes route params as a promise. */
  params: Promise<{ slug: string }>;
}

function findProject(slug: string): Project | undefined {
  return projects.find(
    (project) => project.id === slug && hasProjectDetail(project),
  );
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const project = findProject(slug);

  if (!project) {
    return { title: siteMeta.title };
  }

  /* The status is part of the title so a search result or a shared link cannot
   * present an in-development project as a finished one. */
  const status = statusLabel(project);
  const name = project.fullTitle ?? project.name;

  return {
    title: `${project.name} — ${personal.name}`,
    description: project.summary,
    openGraph: {
      type: "article",
      title: status !== null ? `${name} (${status})` : name,
      description: project.summary,
    },
  };
}

/* ── Structural copy ───────────────────────────────────────────────────────── */

const HEADING_ID = "case-study-heading";
const RESERVED_HEADING_ID = "case-study-reserved-heading";

const BACK_LABEL = "Selected Work";
const OVERVIEW_LABEL = "Overview";
const TECH_LABEL = "Stack";

/**
 * The reserved outline's own framing. It states the situation plainly — these
 * sections are planned, not missing — and makes no promise about when.
 */
const RESERVED_HEADING = "Reserved for documentation";
const RESERVED_NOTE =
  "These sections are part of the planned case study and will be written up as the project develops. Nothing is documented here until it is confirmed.";
const RESERVED_MARK = "Not yet documented";

/* ── Section model ─────────────────────────────────────────────────────────── */

type SectionBody =
  | { kind: "prose"; text: string }
  | { kind: "list"; items: readonly string[] }
  | { kind: "reserved" };

interface DetailSection {
  label: string;
  body: SectionBody;
}

/**
 * The page's ordering table, following the case-study layout: the overview and
 * the framing first, then the technical account, then what is still open.
 *
 * Each row resolves its own body. `reserved` names the matching row in the data's
 * `reservedSections` — a section can therefore be filled in either through its
 * typed field (`detail.architecture`) or through that reserved row's `body`,
 * whichever the content suits, and it renders in this position either way.
 */
const SECTION_ORDER: readonly {
  label: string;
  resolve: (project: Project) => SectionBody;
}[] = [
  {
    label: OVERVIEW_LABEL,
    // Always real: `summary` is required on every project.
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

/**
 * Sections that are only shown once they have content — they are not part of the
 * planned outline, so a reserved row for them would advertise a section nobody
 * committed to writing.
 */
const OPTIONAL_SECTIONS: readonly {
  label: string;
  resolve: (project: Project) => SectionBody;
}[] = [{ label: "What I Learned", resolve: (p) => list(p.detail.lessons, p) }];

/** A prose body, or reserved when the field is null. */
function prose(text: string | null): SectionBody {
  return text !== null ? { kind: "prose", text } : { kind: "reserved" };
}

/**
 * A list body. Falls back to the named reserved row's `body` when the typed array
 * is empty, so either data shape can supply the content.
 */
function list(
  items: readonly string[],
  project: Project,
  reservedLabel?: string,
): SectionBody {
  if (items.length > 0) return { kind: "list", items };
  return reservedLabel !== undefined
    ? reserved(project, reservedLabel)
    : { kind: "reserved" };
}

/** The named reserved row's body, or the reserved state when it has none. */
function reserved(project: Project, label: string): SectionBody {
  const row = project.detail.reservedSections.find(
    (entry) => entry.label === label,
  );
  return row !== undefined && row.body !== null
    ? { kind: "prose", text: row.body }
    : { kind: "reserved" };
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default async function ProjectDetailPage({ params }: PageParams) {
  const { slug } = await params;
  const project = findProject(slug);

  if (!project) {
    notFound();
  }

  const status = statusLabel(project);
  const active = statusIsActive(project);
  const repo = presentRepository(project);

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

  const documented = resolved.filter(
    (section) => section.body.kind !== "reserved",
  );
  const reservedLabels = resolved
    .filter((section) => section.body.kind === "reserved")
    .map((section) => section.label);

  return (
    <Section id="case-study" labelledBy={HEADING_ID}>
      <article>
        {/* ── Back ───────────────────────────────────────────────────────────
         * A real route, not a history call, so it behaves the same whether the
         * visitor arrived from the Work section or straight from a shared link. */}
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

        {/* ── Title block ────────────────────────────────────────────────────
         * The status sits on the line above the title, so where the project
         * actually stands is read before its name — a case study for unfinished
         * work must not open like a launch announcement. */}
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
            /* `text-h2` is the largest scale below the hero's `text-display`.
             * A case study is a sub-page, not a second front door, so it takes
             * the section-heading scale rather than the display one. */
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

        {/* ── Stack + repository ─────────────────────────────────────────────
         * Both are data-gated. An empty `tech` array renders no chips, and the
         * repository row follows the same four-state rule the Work cards use —
         * a link only for a verified public repository. */}
        {project.tech.length > 0 || repo.kind !== "none" ? (
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

              {repo.kind === "link" ? (
                <a
                  href={repo.href}
                  aria-label={`${repo.label}: ${project.name}`}
                  {...(isExternalHref(repo.href)
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className={cn(
                    "group inline-flex min-h-11 items-center gap-2 text-small text-muted",
                    "transition-colors duration-[var(--dur-base)] ease-[var(--ease-spatial)]",
                    "hover:text-text",
                  )}
                >
                  {repo.label}
                  <span
                    aria-hidden="true"
                    className="text-subtle transition-transform duration-[var(--dur-base)] ease-[var(--ease-spatial)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  >
                    ↗
                  </span>
                </a>
              ) : null}

              {/* A recessed, unfocusable state marker — never a link to a
               * repository a visitor cannot open. */}
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

        {/* ── Documented sections ────────────────────────────────────────── */}
        {documented.length > 0 ? (
          <div className="mt-16 space-y-12 md:mt-20 md:space-y-16">
            {documented.map((section, index) => (
              <DocumentedSection
                key={section.label}
                section={section}
                delay={Math.min(index * 60, 300)}
              />
            ))}
          </div>
        ) : null}

        {/* ── Reserved outline ───────────────────────────────────────────── */}
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

              {/* Compact rows rather than a heading per empty section: the
               * outline is the information, and it stays readable at a glance
               * instead of stretching over several screens of blank space. */}
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

/* ── DocumentedSection ─────────────────────────────────────────────────────── */

interface DocumentedSectionProps {
  section: DetailSection;
  delay: number;
}

/**
 * One written section: a mono label above a hairline, then the body at reading
 * measure. Rendered as an `h2` under the page's `h1`, so the outline is a real
 * document structure and not a run of styled paragraphs.
 *
 * The `reserved` case cannot reach here — it is filtered out upstream and shown
 * in the outline instead — so the switch handles the two content shapes only.
 */
function DocumentedSection({ section, delay }: DocumentedSectionProps) {
  const { label, body } = section;

  return (
    <Reveal delay={delay} shift={16}>
      <div className="flex items-baseline gap-4">
        <h2 className="kicker">{label}</h2>
        <span aria-hidden="true" className="hairline-x flex-1" />
      </div>

      {body.kind === "prose" ? (
        <p className="measure text-body mt-5 text-muted">{body.text}</p>
      ) : null}

      {body.kind === "list" ? (
        <ul className="mt-5 space-y-2.5">
          {body.items.map((item) => (
            <li
              key={item}
              className="measure text-body relative pl-5 text-muted"
            >
              <span
                aria-hidden="true"
                // Optically centred on the first line, not the box.
                className="absolute left-0 top-[0.72em] size-1 rounded-full bg-faint"
              />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </Reveal>
  );
}
