"use client";

/**
 * Experience — a vertical timeline that ends in the present.
 *
 * The data is in ASCENDING chronological order, so the section reads as a
 * progression: the earliest role at the top, the ongoing one at the bottom. That
 * inverts the usual résumé stacking, and it changes what the rail has to say.
 *
 * RAIL — the rail connects nodes, nothing more.
 * Segments are drawn per entry (no component here can know the distance between
 * two nodes without measuring), all anchored to the same node offset, so they
 * abut exactly at the list-item boundary and any number of entries reads as one
 * unbroken line. It begins at the first node and it ENDS IN the last one. The
 * earlier "fade out at the bottom" treatment was written when the last entry was
 * also the only entry; under ascending order it would dissolve the *current*
 * role's node into the page — trailing off at precisely the moment the story
 * arrives at now. So the fade is gone: the line terminates in the live node, and
 * on the final approach it gains definition instead of losing it. A one-entry
 * list consequently draws no rail at all, which is the honest degenerate case —
 * a single node has nothing to connect to, and a line pointing into empty space
 * would be worse than a lone marker.
 *
 * ASYMMETRY — Static Inc. carries four highlights and a two-item stack; the
 * ongoing role carries neither, because nothing has been claimed for it yet.
 * Both blocks are data-gated, and the difference is answered structurally rather
 * than papered over: the current entry takes the section's one level-3 surface
 * and sets its summary at lead size in full contrast, so brevity reads as
 * emphasis. No "to be added" copy — silence is the truthful state here, and
 * invented bullet points would be worse than both.
 */

import type { ExperienceItem as ExperienceItemContent } from "@/data/portfolio";
import { usePublicPortfolio } from "@/lib/portfolio/publicContext";
import { getDefaultSectionsConfig } from "@/lib/cms/storage";
import { Chip } from "@/components/primitives/Chip";
import { GlassPanel } from "@/components/primitives/GlassPanel";
import { Reveal } from "@/components/primitives/Reveal";
import { Section } from "@/components/primitives/Section";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { cn } from "@/lib/cn";

/**
 * The `experience` export is a bare array with no kicker/heading fields, so this
 * section's own labels live here (same arrangement as `Skills` and `Education`).
 * They mirror the "Experience" entry in `navSections`.
 */
const SECTION_INDEX = "04";
const SECTION_KICKER = "Experience";
const SECTION_HEADING = "Experience";

/**
 * Structural UI labels — not portfolio content. `CURRENT_LABEL` exists so the
 * ongoing state is never communicated by the green dot alone.
 */
const CURRENT_LABEL = "Current";
const STATUS_TERM = "Status";
const PERIOD_TERM = "Period";
const DURATION_TERM = "Duration";
const LOCATION_TERM = "Location";
const HIGHLIGHTS_LABEL = "Highlights";
const TECH_LABEL = "Stack";

/**
 * Rail geometry, expressed once. Both values are 1.75rem: the node sits that far
 * below its entry's top edge, so the first segment starts there (`top-7`) and
 * the last segment is exactly that tall (`h-7`), ending in the node. Change one
 * and change the other.
 */
const NODE_OFFSET_CLASS = "top-7";
const RAIL_TO_NODE_CLASS = "h-7";

/**
 * The final approach to a live node: the line warms into the live tint as it
 * arrives, the inverse of the old closing fade. Layered over the segment's flat
 * `bg-[var(--hairline)]` and starting from `transparent`, so it only ever ADDS
 * light — the segment above meets it with no seam, and if `color-mix` is
 * unavailable the line simply stays a plain hairline. Tokens only, no literal
 * colours.
 */
const LIVE_APPROACH_GRADIENT =
  "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--color-live) 14%, transparent) 48%, color-mix(in srgb, var(--color-live) 58%, transparent) 100%)";

/* ── Experience ────────────────────────────────────────────────────────────── */

export function Experience() {
  const { draft } = usePublicPortfolio();
  const experience = draft.experience.filter((item) => item.isVisible !== false);
  const sectionSetting = (draft.sectionsConfig ?? getDefaultSectionsConfig()).sections.experience;
  /**
   * Level 3 is reserved for one focal surface per section, and here that is the
   * role that is actually ongoing. Resolved by id (not index) so only the first
   * `current` entry is ever promoted, however the data grows.
   */
  const featuredId = experience.find((item) => item.current)?.id ?? null;
  const lastIndex = experience.length - 1;

  if (experience.length === 0) return null;

  return (
    <Section id="experience" labelledBy="experience-heading">
      <SectionHeading
        index={SECTION_INDEX}
        kicker={SECTION_KICKER}
        heading={sectionSetting.headingOverride ?? SECTION_HEADING}
        lead={sectionSetting.introOverride ?? undefined}
        id="experience-heading"
      />

      {/* Ordered: the sequence of roles is the meaning. The gap between entries
       * lives in each item's bottom padding, never as a list gap, so the rail
       * stays continuous across the boundary. */}
      <ol>
        {experience.map((item, index) => (
          <ExperienceItem
            key={item.id}
            item={item}
            delay={Math.min(index * 80, 420)}
            first={index === 0}
            last={index === lastIndex}
            featured={item.id === featuredId}
          />
        ))}
      </ol>
    </Section>
  );
}

/* ── ExperienceItem ────────────────────────────────────────────────────────── */

export interface ExperienceItemProps {
  item: ExperienceItemContent;
  /** Scroll-reveal stagger for this entry. */
  delay?: number;
  /** First entry — its segment begins at the node instead of the top edge. */
  first?: boolean;
  /** Last entry — its segment stops at the node instead of running past it. */
  last?: boolean;
  /** Promotes the entry to the section's single level-3 surface. */
  featured?: boolean;
}

/**
 * One timeline entry: rail segment, node, and the record itself. Owns its list
 * item and reveal so `Experience` stays a plain map over the data.
 */
export function ExperienceItem({
  item,
  delay = 0,
  first = false,
  last = false,
  featured = false,
}: ExperienceItemProps) {
  const roleId = `experience-${item.id}-role`;
  const organisationId = `experience-${item.id}-organisation`;

  /** Both blocks are data-gated — see the ASYMMETRY note at the top. */
  const hasHighlights = item.highlights.length > 0;
  const hasTech = item.tech.length > 0;

  /**
   * `string | null`. Held as a local so the check below narrows the value that
   * actually gets rendered, and so an empty string is treated as absent too.
   */
  const duration = item.duration;

  /** A lone entry is both ends of the line, so there is no line to draw. */
  const hasRail = !(first && last);

  return (
    <Reveal
      as="li"
      delay={delay}
      shift={18}
      // pl- clears the rail; the pb- gap only exists between entries.
      className={cn("relative pl-9 sm:pl-11", !last && "pb-8 md:pb-10")}
    >
      {/* ── Rail ─────────────────────────────────────────────────────────── */}
      {hasRail ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-[5px] w-px bg-[var(--hairline)]",
            // Born at the first node, rather than at the card's top edge.
            first ? NODE_OFFSET_CLASS : "top-0",
            // Terminates in the last node, rather than running past it.
            last ? RAIL_TO_NODE_CLASS : "bottom-0",
          )}
          style={
            last && item.current
              ? { backgroundImage: LIVE_APPROACH_GRADIENT }
              : undefined
          }
        />
      ) : null}

      {/* ── Node ─────────────────────────────────────────────────────────────
       * 11px ring centred on the rail and aligned with the role's first line.
       * The live variant pulses — it is the one moving thing in the section, and
       * it marks where the timeline arrives. The words beside the period carry
       * the actual state.
       */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 flex size-[11px] items-center justify-center",
          NODE_OFFSET_CLASS,
        )}
      >
        <span
          className={cn(
            "absolute inset-0 rounded-full border",
            item.current ? "border-live/40" : "border-[var(--hairline-strong)]",
          )}
        />
        <span
          className={cn(
            "size-1.5 rounded-full",
            item.current ? "bg-live motion-safe:animate-pulse-dot" : "bg-faint",
          )}
        />
      </span>

      <GlassPanel
        as="article"
        level={featured ? 3 : 2}
        sheen
        rim
        // Named by role and organisation together, so the card announces as
        // "Web Developer Intern InAmigos Foundation" rather than just a job title.
        aria-labelledby={`${roleId} ${organisationId}`}
        className="rounded-card p-6 md:p-7"
      >
        {/* Mobile: role, then metadata, then prose — the reading order of a
         * record. Desktop: the metadata moves out to a right-hand column beside
         * the role, spanning both rows so it never pushes the prose down. */}
        <div className="grid grid-cols-1 gap-y-4 md:grid-cols-12 md:gap-x-8 md:gap-y-6">
          {/* ── Identity ─────────────────────────────────────────────── */}
          <div className="md:col-span-7 md:col-start-1 md:row-start-1">
            <h3 id={roleId} className="text-h3 text-text">
              {item.role}
            </h3>

            {/* Subordinate to the role by scale, but full contrast so it stays
             * the thing you scan for. */}
            <p id={organisationId} className="text-h4 mt-2.5 text-text">
              {item.organisation}
            </p>
          </div>

          {/* ── Metadata ─────────────────────────────────────────────── */}
          <div className="md:col-span-4 md:col-start-9 md:row-span-2 md:row-start-1 md:text-right">
            <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5 md:flex-col md:items-end md:gap-y-2">
              <div className="min-w-0">
                <dt className="sr-only">{PERIOD_TERM}</dt>
                <dd className="font-mono text-small text-muted">
                  {item.period}
                </dd>
              </div>

              {/* Stated length of the engagement. Quieter than the period and
               * set in sentence case, so it reads as a note on the dates rather
               * than as another field of the same rank. */}
              {duration ? (
                <div className="min-w-0">
                  <dt className="sr-only">{DURATION_TERM}</dt>
                  <dd className="font-mono text-micro tracking-[0.02em] text-subtle">
                    {duration}
                  </dd>
                </div>
              ) : null}

              <div className="min-w-0">
                <dt className="sr-only">{LOCATION_TERM}</dt>
                <dd className="font-mono text-micro uppercase tracking-[0.16em] text-subtle">
                  {item.location}
                </dd>
              </div>

              {item.current ? (
                <div className="min-w-0">
                  <dt className="sr-only">{STATUS_TERM}</dt>
                  <dd className="flex items-center gap-2">
                    {/* Static: the pulsing node on the rail already carries the
                     * live signal, and on mobile these two sit inches apart. */}
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full bg-live"
                    />
                    <span className="font-mono text-micro uppercase tracking-[0.16em] text-live">
                      {CURRENT_LABEL}
                    </span>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          {/* ── Record ───────────────────────────────────────────────── */}
          <div className="md:col-span-7 md:col-start-1 md:row-start-2">
            {/* The focal entry gets lead size at full contrast: with no
             * highlights and no stack to show, the summary is the card, so it is
             * set as a statement instead of as an introduction to nothing. */}
            <p
              className={cn(
                "measure",
                featured ? "text-lead text-text" : "text-body text-muted",
              )}
            >
              {item.summary}
            </p>

            {hasHighlights ? (
              <div className="mt-7">
                <span aria-hidden="true" className="hairline-x block" />
                <p className="kicker kicker-muted mt-5">{HIGHLIGHTS_LABEL}</p>
                <ul className="mt-3 space-y-2.5">
                  {item.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="measure relative pl-5 text-body text-muted"
                    >
                      <span
                        aria-hidden="true"
                        // Optical alignment with the first line of the item.
                        className="absolute left-0 top-[0.72em] size-1 rounded-full bg-faint"
                      />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {hasTech ? (
              <div className="mt-6">
                <p className="kicker kicker-muted">{TECH_LABEL}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {item.tech.map((technology) => (
                    <Chip
                      key={technology}
                      label={technology}
                      className="py-2"
                    />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </GlassPanel>
    </Reveal>
  );
}
