"use client";

/**
 * Currently Exploring — a numbered index, set like a table of contents.
 *
 * These are interests, not destinations: there is nothing to click, so the rows
 * are plain list items with no anchor, no button and no tab stop. Structure
 * comes from hairlines, large type and vertical space rather than from cards —
 * four floating panels would badly overstate four one-line interests.
 *
 * Each row is `01 — Label` in the left seven columns with the supporting caption
 * baseline-aligned in the right five, collapsing to a stacked pair on mobile.
 * Adding a fifth interest to the data file needs no layout work.
 *
 * Motion is entrance-only: a per-row `Reveal` stagger. Nothing here is scroll-
 * linked, and nothing's meaning depends on it — with JS off or reduced motion on,
 * the list is simply present.
 */

import { exploring, type ExploringItem } from "@/data/portfolio";
import { Reveal } from "@/components/primitives/Reveal";
import { Section } from "@/components/primitives/Section";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { cn } from "@/lib/cn";

/**
 * Like `skills`, the `exploring` export is a bare array with no kicker/heading
 * fields, so this section's own labels live here. Move them to the data file if
 * it ever grows an `exploring` heading object.
 */
const SECTION_INDEX = "05";
const SECTION_KICKER = "Currently Exploring";
const SECTION_HEADING = "Currently Exploring";

/* ── CurrentlyExploring ────────────────────────────────────────────────────── */

export function CurrentlyExploring() {
  const lastIndex = exploring.length - 1;

  return (
    <Section id="exploring" labelledBy="exploring-heading">
      <SectionHeading
        index={SECTION_INDEX}
        kicker={SECTION_KICKER}
        heading={SECTION_HEADING}
        id="exploring-heading"
      />

      {/* Ordered: the numbering is the content, not decoration. */}
      <ol>
        {exploring.map((item, index) => (
          <ExploringRow
            key={item.id}
            item={item}
            delay={Math.min(index * 80, 420)}
            closing={index === lastIndex}
          />
        ))}
      </ol>
    </Section>
  );
}

/* ── ExploringRow ──────────────────────────────────────────────────────────── */

export interface ExploringRowProps {
  item: ExploringItem;
  /** Scroll-reveal stagger for this row. */
  delay?: number;
  /** Draws the closing rule under the final row so the table reads as finished. */
  closing?: boolean;
}

/**
 * One interest. Owns its list item and reveal so `CurrentlyExploring` stays a
 * plain map over the data.
 *
 * The hover is deliberately minimal — the numeral warms to accent, the label
 * resolves to full contrast, and the pair leans 4px toward the margin. Tailwind
 * scopes `hover:`/`group-hover:` behind `@media (hover: hover)`, so touch users
 * never get a stuck hover state; the resting colours are legible on their own.
 */
export function ExploringRow({
  item,
  delay = 0,
  closing = false,
}: ExploringRowProps) {
  // `caption` is typed as a plain string, but an empty one would leave a hole in
  // the right column. Drop the column entirely rather than render a blank box.
  const hasCaption = item.caption.trim().length > 0;

  return (
    <Reveal
      as="li"
      delay={delay}
      shift={16}
      className={cn("group border-t border-[var(--hairline)]", closing && "border-b")}
    >
      <div className="grid grid-cols-1 gap-2.5 py-8 md:grid-cols-12 md:items-baseline md:gap-8 md:py-10 lg:gap-10">
        {/* ── Index — em dash — label ────────────────────────────────────── */}
        <div className="flex items-baseline gap-3 transition-transform duration-[var(--dur-base)] ease-[var(--ease-spatial)] group-hover:translate-x-1 sm:gap-4 md:col-span-7">
          {/* The <ol> already announces the ordinal; this is its visual twin. */}
          <span
            aria-hidden="true"
            className="text-h3 shrink-0 font-mono text-faint transition-colors duration-[var(--dur-base)] ease-[var(--ease-spatial)] group-hover:text-accent"
          >
            {item.index}
          </span>

          <span aria-hidden="true" className="text-h3 shrink-0 text-faint">
            —
          </span>

          {/* `min-w-0` lets a long label wrap inside its own box instead of
              pushing the row past the content column on narrow screens. */}
          <h3 className="text-h3 min-w-0 text-muted transition-colors duration-[var(--dur-base)] ease-[var(--ease-spatial)] group-hover:text-text">
            {item.label}
          </h3>
        </div>

        {/* ── Supporting detail ──────────────────────────────────────────── */}
        {hasCaption ? (
          <p className="measure-tight text-small text-muted md:col-span-5">
            {item.caption}
          </p>
        ) : null}
      </div>
    </Reveal>
  );
}
