"use client";

/**
 * Skills — an editorial index, not a scoreboard.
 *
 * Deliberately no proficiency bars, percentages or ratings: those numbers would
 * be fabricated. The categories carry the scope, the chips carry the tooling.
 *
 * Layout: the three categories hold 4 / 7 / 5 items, so equal columns would look
 * ragged. Instead each category is a full-width row — label and caption in a
 * narrow left rail, chips flowing through a wide right column — separated by
 * hairlines rather than each becoming its own floating card. Adding a fourth
 * category, or ten more chips to an existing one, needs no layout work.
 */

import {
  skills,
  type SkillCategory as SkillCategoryContent,
} from "@/data/portfolio";
import { Chip } from "@/components/primitives/Chip";
import { Reveal } from "@/components/primitives/Reveal";
import { Section } from "@/components/primitives/Section";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { cn } from "@/lib/cn";

/**
 * Unlike `about` and `contact`, the `skills` export is a bare array with no
 * kicker/heading fields, so this section's own labels live here. They mirror the
 * "Skills" entry in `navSections`. Move them to the data file if it ever grows a
 * `skills` heading object.
 */
const SECTION_INDEX = "02";
const SECTION_KICKER = "Skills";
const SECTION_HEADING = "Skills";

/**
 * Shown only if a category is ever published with an empty `items` array. Every
 * current category has items, so this branch is a designed safety net rather
 * than something on screen today — it must never read as a broken empty box.
 */
const PENDING_ITEMS_COPY = "Tooling for this area is still being confirmed.";

/* ── Skills ────────────────────────────────────────────────────────────────── */

export function Skills() {
  return (
    <Section id="skills" labelledBy="skills-heading">
      <SectionHeading
        index={SECTION_INDEX}
        kicker={SECTION_KICKER}
        heading={SECTION_HEADING}
        id="skills-heading"
      />

      {/* Rows, not cards: the divider does the structural work. */}
      <ul>
        {skills.map((category, index) => (
          <SkillCategory
            key={category.id}
            category={category}
            delay={Math.min(index * 80, 420)}
            divider={index > 0}
          />
        ))}
      </ul>
    </Section>
  );
}

/* ── SkillCategory ─────────────────────────────────────────────────────────── */

export interface SkillCategoryProps {
  category: SkillCategoryContent;
  /** Scroll-reveal stagger for this row. */
  delay?: number;
  /** Draws the hairline above the row. Omitted on the first row. */
  divider?: boolean;
}

/**
 * One category row. Owns its own list item and reveal so `Skills` stays a plain
 * map over the data.
 */
export function SkillCategory({
  category,
  delay = 0,
  divider = false,
}: SkillCategoryProps) {
  const headingId = `skills-${category.id}-label`;
  const hasItems = category.items.length > 0;

  return (
    <Reveal
      as="li"
      delay={delay}
      shift={16}
      className={cn(divider && "border-t border-[var(--hairline)]")}
    >
      <div
        className={cn(
          "grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-10",
          // First row leans on the heading's own margin for its top space.
          divider ? "py-8 md:py-10" : "pb-8 md:pb-10",
        )}
      >
        {/* ── Left rail: index, label, caption ──────────────────────────── */}
        <div className="md:col-span-4">
          <div className="flex items-baseline gap-3">
            <span aria-hidden="true" className="font-mono text-small text-faint">
              {category.index}
            </span>
            <h3 id={headingId} className="text-h4 text-text">
              {category.label}
            </h3>
          </div>

          <p className="measure-tight mt-2.5 text-small text-muted">
            {category.caption}
          </p>
        </div>

        {/* ── Right column: the tooling itself ──────────────────────────── */}
        <div className="md:col-span-8">
          {hasItems ? (
            <ul
              aria-labelledby={headingId}
              className="flex flex-wrap gap-2.5 md:pt-0.5"
            >
              {category.items.map((item) => (
                <SkillItem key={item} label={item} />
              ))}
            </ul>
          ) : (
            /* Recessed well: reads as reserved-by-design, not as a failure. */
            <div className="glass-well rounded-control px-4 py-5">
              <p className="text-small text-subtle">{PENDING_ITEMS_COPY}</p>
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
}

/* ── SkillItem ─────────────────────────────────────────────────────────────── */

export interface SkillItemProps {
  label: string;
  className?: string;
}

/**
 * One skill. Extends `Chip` (which already renders the `<li>` and the level-1
 * material) with a restrained hover: the border brightens and the label resolves
 * to full contrast. No scale, no glow — these are labels, not buttons.
 */
export function SkillItem({ label, className }: SkillItemProps) {
  return (
    <Chip
      label={label}
      className={cn(
        "py-2 hover:border-[var(--hairline-strong)] hover:text-text",
        className,
      )}
    />
  );
}
