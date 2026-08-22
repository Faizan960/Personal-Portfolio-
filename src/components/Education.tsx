"use client";

/**
 * Education — two qualifications, each composed as a specimen plate.
 *
 * The plate leads with the award ("Diploma", "BE") as a mono field label, then the
 * field of study alone at heading scale, a hairline, and a three-field record
 * strip along the bottom. The award/qualification pair is the credential: reading
 * down the plate gives "Diploma — Computer Science" without either half being
 * flattened into a generic list row.
 *
 * Sibling to `Experience` — same card material, same mono micro-labels, same
 * live-status treatment and bullet style — but deliberately not the same shape:
 * Experience runs a vertical timeline with metadata stacked to the right, while
 * Education reads horizontally, label-above-value.
 *
 * Pending policy (one rule, applied to every nullable field): the field's label
 * always renders, and a missing value renders as a faint mono em dash with
 * screen-reader text. Every institution, period and location is filled in today,
 * so no dash currently appears — the branch stays because these fields are typed
 * nullable and a future entry may arrive incomplete. `details` is empty for both
 * entries and so renders nothing at all; no invented coursework, no CGPA.
 */

import { education, type EducationItem } from "@/data/portfolio";
import { GlassPanel } from "@/components/primitives/GlassPanel";
import { Reveal } from "@/components/primitives/Reveal";
import { Section } from "@/components/primitives/Section";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { cn } from "@/lib/cn";

/**
 * The `education` export is a bare array with no kicker/heading fields, so this
 * section's own labels live here — the same arrangement as `Skills` and
 * `Experience`. Education is intentionally absent from `navSections` but still
 * exists as a scroll target.
 */
const SECTION_INDEX = "05";
const SECTION_KICKER = "Education";
const SECTION_HEADING = "Education";

/**
 * Structural UI labels — not portfolio content. The plate's own top label is
 * `item.award` from the data, not a constant, so it names the actual credential
 * rather than the generic word "Qualification". `IN_PROGRESS_LABEL` exists so the
 * ongoing state is never carried by the green dot alone.
 */
const INSTITUTION_TERM = "Institution";
const PERIOD_TERM = "Period";
const LOCATION_TERM = "Location";
const DETAILS_LABEL = "Details";
const IN_PROGRESS_LABEL = "In progress";

/** Typographic marker for an unfilled field, plus its spoken equivalent. */
const PENDING_MARK = "—";
const PENDING_LABEL = "Not provided";

/* ── Education ─────────────────────────────────────────────────────────────── */

export function Education() {
  return (
    <Section id="education" labelledBy="education-heading">
      <SectionHeading
        index={SECTION_INDEX}
        kicker={SECTION_KICKER}
        heading={SECTION_HEADING}
        id="education-heading"
      />

      {/* Ordered: a chronological record, ascending — the diploma precedes the
       * degree, so the section reads as a progression. The order is the data's. */}
      <ol className="space-y-6 md:space-y-8">
        {education.map((item, index) => (
          <EducationRecord
            key={item.id}
            item={item}
            delay={Math.min(index * 80, 420)}
          />
        ))}
      </ol>
    </Section>
  );
}

/* ── EducationRecord ───────────────────────────────────────────────────────── */

export interface EducationRecordProps {
  item: EducationItem;
  /** Scroll-reveal stagger for this entry. */
  delay?: number;
}

/**
 * One qualification. Owns its list item and reveal so `Education` stays a plain
 * map over the data.
 */
export function EducationRecord({ item, delay = 0 }: EducationRecordProps) {
  const headingId = `education-${item.id}-qualification`;
  const awardId = `education-${item.id}-award`;
  const hasDetails = item.details.length > 0;

  /**
   * The record strip as data, so the row is one map rather than three
   * near-identical blocks — and so a future field is a single line to add.
   */
  const fields: ReadonlyArray<{ term: string; value: string | null }> = [
    { term: INSTITUTION_TERM, value: item.institution },
    { term: PERIOD_TERM, value: item.period },
    { term: LOCATION_TERM, value: item.location },
  ];

  return (
    <Reveal as="li" delay={delay} shift={18}>
      <GlassPanel
        as="article"
        level={2}
        sheen
        rim
        /* Both halves of the credential, so the article announces "Diploma,
         * Computer Science" rather than the field of study on its own. */
        aria-labelledby={`${awardId} ${headingId}`}
        className="rounded-card p-6 sm:p-8 md:p-10 lg:p-12"
      >
        {/* ── Award + status ────────────────────────────────────────────────
         * Two mono lines framing the top of the plate. On mobile they stack
         * rather than wrap awkwardly against each other.
         */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p id={awardId} className="kicker">
            {item.award}
          </p>

          {/* Truthful and straight from the data — `current: true`. The dot is
           * decorative; the words carry the state. */}
          {item.current ? (
            <p className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-live motion-safe:animate-pulse-dot"
              />
              <span className="font-mono text-micro uppercase tracking-[0.16em] text-live">
                {IN_PROGRESS_LABEL}
              </span>
            </p>
          ) : null}
        </div>

        {/* ── Field of study ───────────────────────────────────────────────
         * Given the whole width of the plate and a wide margin below it. The
         * scale is the composition; nothing else competes with it.
         */}
        <h3
          id={headingId}
          className="measure-tight text-h3 mt-6 text-text md:mt-8"
        >
          {item.qualification}
        </h3>

        <span aria-hidden="true" className="hairline-x mt-8 block md:mt-10" />

        {/* ── Record strip ──────────────────────────────────────────────────
         * Desktop: three columns divided by vertical hairlines. Mobile: stacked
         * rows divided horizontally — a squeezed three-up would leave the labels
         * unreadable. Labels always render, so an unfilled value still reads as
         * a known field awaiting a value.
         */}
        <dl className="mt-8 grid grid-cols-1 sm:grid-cols-3">
          {fields.map(({ term, value }, index) => (
            <div
              key={term}
              className={cn(
                "border-[var(--hairline-faint)] py-4 sm:py-0 sm:pr-5 lg:pr-8",
                index > 0 &&
                  "border-t sm:border-t-0 sm:border-l sm:pl-5 lg:pl-8",
              )}
            >
              <dt className="font-mono text-micro uppercase tracking-[0.16em] text-subtle">
                {term}
              </dt>
              <dd className="text-small mt-2.5">
                {value ? (
                  // `overflow-wrap` guards long institution names on narrow
                  // screens — the section must never scroll horizontally.
                  <span className="text-text [overflow-wrap:anywhere]">
                    {value}
                  </span>
                ) : (
                  <>
                    <span aria-hidden="true" className="font-mono text-faint">
                      {PENDING_MARK}
                    </span>
                    {/* The dash is decorative, so the state is spelled out for
                     * assistive tech — announces as "Institution, Not provided". */}
                    <span className="sr-only">{PENDING_LABEL}</span>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>

        {/* Data-gated: empty today, so nothing renders. Deliberately no
         * placeholder coursework — silence beats invented bullets. */}
        {hasDetails ? (
          <div className="mt-8 md:mt-10">
            <span aria-hidden="true" className="hairline-x block" />
            <p className="kicker kicker-muted mt-6">{DETAILS_LABEL}</p>
            <ul className="mt-3 space-y-2.5">
              {item.details.map((detail) => (
                <li
                  key={detail}
                  className="measure text-body relative pl-5 text-muted"
                >
                  <span
                    aria-hidden="true"
                    // Optically centred on the first line, not the box.
                    className="absolute left-0 top-[0.72em] size-1 rounded-full bg-faint"
                  />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </GlassPanel>
    </Reveal>
  );
}
