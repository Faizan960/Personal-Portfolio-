"use client";

/**
 * Selected Work.
 *
 * REPOSITORY VISIBILITY IS THE GATE
 * A repository URL being present in the data says nothing about whether a visitor
 * can open it. Visibility changes over time — repositories go public, go private,
 * or do not exist yet — so this file never infers a link from `github !== null`.
 * Every repository presentation comes from `presentRepository` in `lib/project`,
 * which switches on the four-state `visibility` field and returns one of three
 * shapes:
 *
 *   link   only for `visibility: "public"` WITH a URL. The single case that
 *          renders an anchor.
 *   label  `"private"` and `"development"`. A recessed, unfocusable `<span>` —
 *          the state is stated in words, and a keyboard user can never reach a
 *          destination that isn't reachable.
 *   none   `"unknown"`. Nothing renders. An unverified repository makes no claim
 *          in either direction.
 *
 * That mapping is shared with the case-study pages so a card and a case study can
 * never disagree about the same repository.
 *
 * Every other action is gated the same way: `liveUrl` must be non-null to produce
 * a live-site link, and the case-study action only appears when
 * `hasProjectDetail` finds real content behind it. There are no placeholder
 * buttons and no `href="#"`.
 *
 * TWO SURFACES
 *   FeaturedProject  the `featured` entry, as a full-width level-3 lead panel. It
 *                    is the section's one focal surface. It carries no media
 *                    block — a full-bleed generative gradient at that width would
 *                    be a large empty rectangle — and instead leads with the name,
 *                    the expanded title and the summary at body scale.
 *   ProjectCard      everything else, as level-2 cards on a responsive grid, with
 *                    the established media recess and generative fallback.
 *
 * Both share `StatusMarker`, `TechStrip` and `ActionShelf`, so a card and the lead
 * panel can never disagree about how a status or a repository is presented.
 *
 * Ordering and promotion both come from the data: the array's order is the render
 * order, and `featured` chooses the lead. Neither is hardcoded here.
 */

import Image from "next/image";
import { hasProjectDetail, type Project } from "@/data/portfolio";
import { usePublicPortfolio } from "@/lib/portfolio/publicContext";
import { getDefaultSectionsConfig } from "@/lib/cms/storage";
import { MagneticButton } from "@/components/primitives/Button";
import { Chip } from "@/components/primitives/Chip";
import { GlassPanel } from "@/components/primitives/GlassPanel";
import { Reveal } from "@/components/primitives/Reveal";
import { Section } from "@/components/primitives/Section";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { cn } from "@/lib/cn";
import {
  isExternalHref,
  presentRepository,
  resolveProjectDetailHref,
  statusIsActive,
  statusLabel,
} from "@/lib/project";

/**
 * The `projects` export is a bare array with no kicker/heading fields, so this
 * section's own labels live here (same arrangement as `Skills` and `Experience`).
 * They mirror the "Work" entry in `navSections`, and the index matches the page
 * order documented in `app/page.tsx`.
 */
const SECTION_INDEX = "03";
const SECTION_KICKER = "Selected Work";
const SECTION_HEADING = "Selected Work";

/** Action labels. Status and repository wording comes from `lib/project`. */
const ACTION_LABELS = {
  detail: "View Project",
  live: "Live Site",
} as const;

const TECH_LABEL = "Stack";

/** Neutral qualifier for a project screenshot — the name carries the meaning. */
const IMAGE_ALT_SUFFIX = "project preview";

/* ── Presentation model ────────────────────────────────────────────────────── */

interface CardAction {
  key: "detail" | "live" | "repo";
  href: string;
  label: string;
}

interface Presentation {
  statusLabel: string | null;
  /** `true` only while a project is actively being built — drives the live dot. */
  statusIsActive: boolean;
  primaryAction: CardAction | undefined;
  secondaryActions: CardAction[];
  /** Non-link repository state, when there is one. */
  repoNote: string | null;
  hasTech: boolean;
  hasShelf: boolean;
}

/**
 * Everything both surfaces need to render one project, derived in one place so a
 * card and the lead panel cannot diverge.
 *
 * Action priority: the case study takes the primary slot when it exists, then the
 * live site, then the repository. That way a project whose only destination is a
 * repository still gets a properly-weighted primary action instead of a lone
 * tertiary link.
 */
function present(project: Project): Presentation {
  const repo = presentRepository(project);

  const actions: CardAction[] = [];
  const detailHref = resolveProjectDetailHref(project, project.summary);
  if (detailHref && (hasProjectDetail(project) || project.summary.trim().length > 0)) {
    actions.push({
      key: "detail",
      href: detailHref,
      label: ACTION_LABELS.detail,
    });
  }
  if (project.liveUrl !== null) {
    actions.push({
      key: "live",
      href: project.liveUrl,
      label: ACTION_LABELS.live,
    });
  }
  if (repo.kind === "link") {
    actions.push({ key: "repo", href: repo.href, label: repo.label });
  }

  /* Under `noUncheckedIndexedAccess` the head of this destructure is
   * `CardAction | undefined` — which is exactly the real "no destination
   * confirmed yet" case, so it is guarded rather than asserted. */
  const [primaryAction, ...secondaryActions] = actions;

  const repoNote = repo.kind === "label" ? repo.label : null;

  return {
    statusLabel: statusLabel(project),
    statusIsActive: statusIsActive(project),
    primaryAction,
    secondaryActions,
    repoNote,
    hasTech: project.tech.length > 0,
    // An empty shelf is worse than no shelf.
    hasShelf: primaryAction !== undefined || repoNote !== null,
  };
}

/* ── Projects ──────────────────────────────────────────────────────────────── */

export function Projects() {
  const { draft, isPreviewMode } = usePublicPortfolio();
  const projects = draft.projects.filter(
    (p) => isPreviewMode || p.isPublished !== false,
  ) as unknown as readonly Project[];
  const sectionSetting = (draft.sectionsConfig ?? getDefaultSectionsConfig()).sections.work;

  /* `find` rather than a filter: the lead surface is singular by definition. If
   * the data ever marks several as featured, the first wins and the rest render
   * as ordinary cards — the section never sprouts competing focal panels. */
  const featured = projects.find((project) => project.featured);
  const rest = projects.filter((project) => project !== featured);

  return (
    <Section id="work" labelledBy="work-heading">
      <SectionHeading
        index={SECTION_INDEX}
        kicker={SECTION_KICKER}
        heading={sectionSetting.headingOverride ?? SECTION_HEADING}
        lead={sectionSetting.introOverride ?? undefined}
        id="work-heading"
      />

      <ul className="space-y-5 md:space-y-6">
        {featured ? <FeaturedProject project={featured} /> : null}

        {rest.length > 0 ? (
          /* A nested list keeps the grid from having to be a sibling of the lead
           * panel while every project stays one list item of the same list. */
          <li>
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-7">
              {rest.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  delay={Math.min(index * 70, 420)}
                />
              ))}
            </ul>
          </li>
        ) : null}
      </ul>
    </Section>
  );
}

/* ── StatusMarker ──────────────────────────────────────────────────────────── */

interface StatusMarkerProps {
  label: string;
  /** Uses the live token and a pulse, matching the ongoing role in `Experience`. */
  active: boolean;
  className?: string;
}

/**
 * A dot plus a mono label. The words carry the state; the dot only reinforces it,
 * so nothing is lost if colour is unavailable. The pulse is `motion-safe`.
 */
function StatusMarker({ label, active, className }: StatusMarkerProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          active ? "bg-live motion-safe:animate-pulse-dot" : "bg-faint",
        )}
      />
      <span
        className={cn(
          "font-mono text-micro uppercase tracking-[0.16em]",
          active ? "text-muted" : "text-subtle",
        )}
      >
        {label}
      </span>
    </span>
  );
}

/* ── TechStrip ─────────────────────────────────────────────────────────────── */

interface TechStripProps {
  id: string;
  tech: readonly string[];
  className?: string;
}

/**
 * The confirmed stack. Only ever rendered when the array is non-empty — an
 * unconfirmed stack shows no chips rather than placeholder ones.
 */
function TechStrip({ id, tech, className }: TechStripProps) {
  return (
    <div className={className}>
      <p id={id} className="kicker kicker-muted">
        {TECH_LABEL}
      </p>
      <ul aria-labelledby={id} className="mt-3 flex flex-wrap gap-2">
        {tech.map((technology) => (
          <Chip key={technology} label={technology} className="py-2" />
        ))}
      </ul>
    </div>
  );
}

/* ── ActionShelf ───────────────────────────────────────────────────────────── */

interface ActionShelfProps {
  presentation: Presentation;
  /** Qualifies each accessible name, since labels repeat across cards. */
  projectName: string;
  className?: string;
}

/**
 * The bottom row: a hairline, then the primary action, any secondary links, and
 * the non-link repository state.
 *
 * `repoNote` is a recessed `<span>`, not a button and not focusable. It sits at
 * button height so a project's proportions do not change when its repository is
 * eventually published and the note becomes a link.
 */
function ActionShelf({
  presentation,
  projectName,
  className,
}: ActionShelfProps) {
  const { primaryAction, secondaryActions, repoNote } = presentation;

  return (
    <div className={className}>
      <span aria-hidden="true" className="hairline-x block" />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-5">
        {primaryAction ? (
          <MagneticButton
            variant="secondary"
            href={primaryAction.href}
            aria-label={`${primaryAction.label}: ${projectName}`}
            {...(isExternalHref(primaryAction.href)
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {primaryAction.label}
            <span aria-hidden="true" className="text-accent">
              {isExternalHref(primaryAction.href) ? "↗" : "→"}
            </span>
          </MagneticButton>
        ) : null}

        {secondaryActions.map((action) => (
          <a
            key={action.key}
            href={action.href}
            aria-label={`${action.label}: ${projectName}`}
            {...(isExternalHref(action.href)
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className={cn(
              "group inline-flex min-h-11 items-center gap-2 text-small text-muted",
              "transition-colors duration-[var(--dur-base)] ease-[var(--ease-spatial)]",
              "hover:text-text",
            )}
          >
            {action.label}
            <span
              aria-hidden="true"
              className={cn(
                "text-subtle",
                "transition-transform duration-[var(--dur-base)] ease-[var(--ease-spatial)]",
                isExternalHref(action.href)
                  ? "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  : "group-hover:translate-x-0.5",
              )}
            >
              {isExternalHref(action.href) ? "↗" : "→"}
            </span>
          </a>
        ))}

        {repoNote !== null ? (
          <span className="glass-well inline-flex min-h-11 items-center rounded-control px-4">
            <span className="font-mono text-micro uppercase tracking-[0.16em] text-subtle">
              {repoNote}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ── FeaturedProject ───────────────────────────────────────────────────────── */

export interface FeaturedProjectProps {
  project: Project;
}

/**
 * The section's lead surface: level 3, `rounded-feature`, full width.
 *
 * The featured treatment communicates *prominence*, not completion. The status
 * marker sits on the top line beside the ordinal, so the first thing read about
 * the lead project is where it actually stands — a featured panel can say "In
 * Development" without the layout implying otherwise.
 */
export function FeaturedProject({ project }: FeaturedProjectProps) {
  const headingId = `work-${project.id}-title`;
  const techLabelId = `work-${project.id}-stack`;
  const presentation = present(project);

  return (
    <Reveal as="li" shift={20}>
      <GlassPanel
        as="article"
        level={3}
        sheen
        rim
        aria-labelledby={headingId}
        className="rounded-feature p-6 sm:p-8 md:p-10 lg:p-12"
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <span aria-hidden="true" className="font-mono text-small text-faint">
            {project.index}
          </span>
          {presentation.statusLabel !== null ? (
            <StatusMarker
              label={presentation.statusLabel}
              active={presentation.statusIsActive}
            />
          ) : null}
          <span aria-hidden="true" className="hairline-x hidden flex-1 sm:block" />
        </div>

        <h3
          id={headingId}
          className="measure-tight text-h2 mt-6 text-text md:mt-8"
        >
          {project.name}
        </h3>

        {/* The expanded title, when the short name is a product name. Held below
         * the heading at h3 scale so the pair reads as one title block. */}
        {project.fullTitle !== null ? (
          <p className="measure text-h3 mt-3 text-muted">{project.fullTitle}</p>
        ) : null}

        <p className="kicker mt-6 md:mt-8">{project.category}</p>

        <p className="measure text-body mt-4 text-muted">{project.summary}</p>

        {presentation.hasTech ? (
          <TechStrip
            id={techLabelId}
            tech={project.tech}
            className="mt-8 md:mt-10"
          />
        ) : null}

        {presentation.hasShelf ? (
          <ActionShelf
            presentation={presentation}
            projectName={project.name}
            className="pt-8 md:pt-10"
          />
        ) : null}
      </GlassPanel>
    </Reveal>
  );
}

/* ── ProjectCard ───────────────────────────────────────────────────────────── */

export interface ProjectCardProps {
  project: Project;
  /** Scroll-reveal stagger for this card. */
  delay?: number;
}

/**
 * One non-featured project. Owns its list item and its reveal so `Projects` stays
 * a plain map over the data.
 *
 * `h-full` on a flex column with the shelf pinned by `mt-auto` keeps footers
 * aligned across a row whatever the summary length.
 */
export function ProjectCard({ project, delay = 0 }: ProjectCardProps) {
  const headingId = `work-${project.id}-title`;
  const techLabelId = `work-${project.id}-stack`;
  const presentation = present(project);

  return (
    <Reveal as="li" delay={delay} shift={18} className="flex">
      <GlassPanel
        as="article"
        level={2}
        sheen
        rim
        interactive
        aria-labelledby={headingId}
        className="flex w-full flex-col rounded-card p-5 sm:p-6"
      >
        {/* ── Media ──────────────────────────────────────────────────────────
         * The real image when there is one; otherwise a generative wash, so a
         * missing asset never becomes a failed request or a broken frame. */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-panel border border-[var(--hairline-faint)]">
          {project.image !== null ? (
            /* `fill` inside this aspect-ratio parent: images are unoptimised in
             * the static export, so the sized parent establishes the box. */
            <Image
              src={project.image}
              alt={`${project.name} — ${IMAGE_ALT_SUFFIX}`}
              fill
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
              className="object-cover"
            />
          ) : (
            /* Two low-opacity washes over a faint sheet, written inline because
             * a multi-stop radial composite has no theme-utility equivalent. The
             * colours are the palette's own `accent` (157 198 216) and
             * `accent-warm` (224 208 180). */
            <div
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center"
              style={{
                backgroundImage:
                  "radial-gradient(115% 85% at 18% 6%, rgb(157 198 216 / 0.16), transparent 58%), radial-gradient(90% 75% at 88% 96%, rgb(224 208 180 / 0.10), transparent 62%), linear-gradient(165deg, rgb(255 255 255 / 0.05), rgb(255 255 255 / 0.01))",
              }}
            >
              <span className="text-h2 font-mono text-faint">
                {project.index}
              </span>
            </div>
          )}

          {/* Overlaid rather than stacked below, so the card's text block starts
           * with the title. Only present when the data states a status. */}
          {presentation.statusLabel !== null ? (
            <span className="glass-1 absolute left-3 top-3 inline-flex items-center rounded-chip px-2.5 py-1.5">
              <StatusMarker
                label={presentation.statusLabel}
                active={presentation.statusIsActive}
              />
            </span>
          ) : null}
        </div>

        {/* ── Record ─────────────────────────────────────────────────────────
         * The ordinal moves up beside the title so it survives the media area
         * being replaced by a real screenshot. */}
        <div className="mt-6">
          <div className="flex items-baseline gap-3">
            <span aria-hidden="true" className="font-mono text-small text-faint">
              {project.index}
            </span>
            <h3
              id={headingId}
              className="text-h3 min-w-0 text-text [overflow-wrap:anywhere]"
            >
              {project.name}
            </h3>
          </div>

          {project.fullTitle !== null ? (
            <p className="text-small mt-2 text-subtle">{project.fullTitle}</p>
          ) : null}

          <p className="kicker kicker-muted mt-4">{project.category}</p>

          <p className="text-small mt-3 text-muted">{project.summary}</p>

          {presentation.hasTech ? (
            <TechStrip
              id={techLabelId}
              tech={project.tech}
              className="mt-5"
            />
          ) : null}
        </div>

        {presentation.hasShelf ? (
          <ActionShelf
            presentation={presentation}
            projectName={project.name}
            className="mt-auto pt-6"
          />
        ) : null}
      </GlassPanel>
    </Reveal>
  );
}
