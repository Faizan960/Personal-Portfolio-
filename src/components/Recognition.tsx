"use client";

/**
 * Recognition — two kinds of claim, deliberately not one list.
 *
 * A competition result and a certificate are different assertions about a person,
 * so they get different surfaces. Flattening them into a single bulleted list
 * would quietly upgrade the certificates and downgrade the result.
 *
 *   Achievements   one focal plate (level 3, `rounded-feature`). The name leads at
 *                  heading scale with the placement completing the same line in
 *                  champagne — the section's only warm accent — so the plate reads
 *                  as one sentence: "SIH Internal Hackathon Winner — 4th Place".
 *                  Warm is reserved for this group precisely so the *kind* is felt
 *                  before the words are read.
 *   Certifications a level-2 pair on a two-up grid, `rounded-card`, ice-labelled.
 *                  Credentials, not results: quieter material, smaller radius,
 *                  no headline number.
 *
 * Both groups are labelled with a mono micro-label rather than an `h3`, because
 * the items themselves are `h3` — the hierarchy is h2 (section) → h3 (item), with
 * the group labels wired in via `aria-labelledby` on each list instead. Nothing
 * is skipped and nothing is doubled up.
 *
 * Pending policy. Every certification has `issued`, `credentialId` and
 * `credentialUrl` set to null today, and the achievement has no `date`. Every one
 * of those is simply absent from the render — no dashes, no "coming soon", no
 * link with nowhere to go. The credential meta strip is built from whatever is
 * non-null, so the one certification that names an issuer shows an attribution
 * and the one that does not shows clean space at the same card height. That
 * asymmetry is the design, not a gap in it.
 */

import type { Achievement, Certification } from "@/data/portfolio";
import { usePublicPortfolio } from "@/lib/portfolio/publicContext";
import { getDefaultSectionsConfig } from "@/lib/cms/storage";
import { GlassPanel } from "@/components/primitives/GlassPanel";
import { Reveal } from "@/components/primitives/Reveal";
import { Section } from "@/components/primitives/Section";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { cn } from "@/lib/cn";

/**
 * The `recognition` export supplies the kicker, heading and both group labels, so
 * only the page ordinal lives here. Recognition is intentionally absent from
 * `navSections` but still exists as a scroll target.
 */
const SECTION_INDEX = "07";

/** Ids linking each list to the mono label that names it. */
const ACHIEVEMENTS_LABEL_ID = "recognition-achievements-label";
const CERTIFICATIONS_LABEL_ID = "recognition-certifications-label";

/**
 * Structural UI terms — not portfolio content. Each one names a field that comes
 * from the data file; none of them assert anything the data does not.
 */
const RESULT_SEPARATOR = " — ";
/**
 * "Associated with", not "Issuer" — one of the two credentials names an educator
 * rather than an awarding body, and calling a person the issuer would assert
 * something the data does not. This wording stays true for both cases.
 */
const ISSUER_TERM = "Associated with";
const ISSUED_TERM = "Issued";
const CREDENTIAL_ID_TERM = "Credential ID";
const VERIFY_LABEL = "Verify";

/** Only http(s) destinations get a new tab; a local path must not. */
function isExternal(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

/* ── Recognition ───────────────────────────────────────────────────────────── */

export function Recognition() {
  const { draft } = usePublicPortfolio();
  const achievements = draft.achievements.filter((a) => a.isVisible !== false);
  const certifications = draft.certifications.filter((c) => c.isVisible !== false);
  const { recognition } = draft;
  const sectionSetting = (draft.sectionsConfig ?? getDefaultSectionsConfig()).sections.recognition;

  const hasAchievements = achievements.length > 0;
  const hasCertifications = certifications.length > 0;

  // With nothing verified in either group there is no section — a heading over
  // empty space would be worse than no heading at all.
  if (!hasAchievements && !hasCertifications) {
    return null;
  }

  return (
    <Section id="recognition" labelledBy="recognition-heading">
      <SectionHeading
        index={SECTION_INDEX}
        kicker={recognition.kicker}
        heading={sectionSetting.headingOverride ?? recognition.heading}
        lead={sectionSetting.introOverride ?? undefined}
        id="recognition-heading"
      />

      {/* ── Achievements ─────────────────────────────────────────────────────
       * Unordered: with no dates in the data there is no sequence to imply.
       */}
      {hasAchievements ? (
        <div>
          <GroupLabel
            id={ACHIEVEMENTS_LABEL_ID}
            label={recognition.achievementsLabel}
            tone="warm"
          />

          <ul
            aria-labelledby={ACHIEVEMENTS_LABEL_ID}
            className="mt-6 space-y-5 md:mt-8"
          >
            {achievements.map((item, index) => (
              <AchievementPlate
                key={item.id}
                item={item}
                delay={Math.min(index * 80, 420)}
                // Level 3 is one focal surface per section. There is exactly one
                // achievement today; if the array grows, the lead entry keeps the
                // focal material and the rest step down to level 2 rather than
                // the section sprouting several competing focal plates.
                focal={index === 0}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── Certifications ───────────────────────────────────────────────── */}
      {hasCertifications ? (
        // The top margin only exists if there is something above to separate
        // from, so a certifications-only section still starts flush.
        <div className={cn(hasAchievements && "mt-16 md:mt-20")}>
          <GroupLabel
            id={CERTIFICATIONS_LABEL_ID}
            label={recognition.certificationsLabel}
            tone="ice"
          />

          <ul
            aria-labelledby={CERTIFICATIONS_LABEL_ID}
            className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:mt-8"
          >
            {certifications.map((item, index) => (
              <CertificationCard
                key={item.id}
                item={item}
                delay={Math.min(index * 80, 420)}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  );
}

/* ── GroupLabel ────────────────────────────────────────────────────────────── */

interface GroupLabelProps {
  /** Referenced by the list's `aria-labelledby`. */
  id: string;
  label: string;
  /**
   * Champagne for results, ice for credentials. The two labels are otherwise
   * identical, so temperature alone carries the distinction of kind. The ice
   * label is the dimmed accent, not the full-strength one — in this palette full
   * ice means focus rings and active states, and a static label must not borrow
   * that signal. It also puts the supporting group a step below the focal one.
   */
  tone: "warm" | "ice";
}

/**
 * The label row for one group: mono micro-label plus a hairline running out to
 * the margin. It echoes `SectionHeading`'s rhythm one level down, and carries no
 * index numeral so it cannot be mistaken for a peer heading.
 *
 * The colours are written out rather than layered on top of the `kicker`
 * utility — `kicker` sets its own colour, and overriding it would depend on
 * utility ordering.
 */
function GroupLabel({ id, label, tone }: GroupLabelProps) {
  return (
    <Reveal className="flex items-baseline gap-4">
      <p
        id={id}
        className={cn(
          "font-mono text-micro uppercase tracking-[0.16em]",
          tone === "warm" ? "text-accent-warm" : "text-accent-dim",
        )}
      >
        {label}
      </p>
      <span aria-hidden="true" className="hairline-x flex-1" />
    </Reveal>
  );
}

/* ── AchievementPlate ──────────────────────────────────────────────────────── */

export interface AchievementPlateProps {
  item: Achievement;
  /** Scroll-reveal stagger for this entry. */
  delay?: number;
  /** Promotes the entry to the section's single level-3 surface. */
  focal?: boolean;
}

/**
 * One competition result, composed as a citation plate: the achievement's name at
 * headline scale with the placement completing the line in champagne, a full-width
 * hairline, then the context that scopes it.
 *
 * Reading order is deliberate. The name comes first and the placement second, so
 * the plate reads "SIH Internal Hackathon Winner — 4th Place" — the placement is a
 * qualifier on the achievement, not a standalone headline with the achievement as
 * its caption. Both halves live inside the `h3`, which keeps the accessible name
 * identical to the visible line instead of splitting it across two elements.
 *
 * `context` is load-bearing — it is what keeps an internal round from reading as
 * a national one — so it sits beneath at body scale, never truncated and never
 * clamped.
 */
export function AchievementPlate({
  item,
  delay = 0,
  focal = false,
}: AchievementPlateProps) {
  const headingId = `recognition-${item.id}-name`;

  // Destructured to locals so the nullable fields narrow cleanly in the JSX.
  const { result, context, date } = item;

  return (
    <Reveal as="li" delay={delay} shift={18}>
      <GlassPanel
        as="article"
        level={focal ? 3 : 2}
        sheen
        rim
        aria-labelledby={headingId}
        className="rounded-feature p-6 sm:p-8 md:p-10 lg:p-12"
      >
        <h3
          id={headingId}
          className="measure-tight text-h2 text-text [overflow-wrap:anywhere]"
        >
          {item.name}
          {/* Absent when a future achievement carries no placement, in which
           * case the name simply stands alone. `nowrap` keeps the dash with the
           * placement so it never orphans at the end of a line. */}
          {result !== null ? (
            <span className="whitespace-nowrap text-accent-warm">
              {RESULT_SEPARATOR}
              {result}
            </span>
          ) : null}
        </h3>

        {context !== null ? (
          <>
            <span
              aria-hidden="true"
              className="hairline-x mt-8 block md:mt-10"
            />
            <p className="measure text-body mt-8 text-muted md:mt-10">
              {context}
            </p>
          </>
        ) : null}

        {/* Null today. Rendered only if a real date is ever supplied — never
         * substituted with a guess. */}
        {date !== null ? (
          <p className="mt-6 font-mono text-micro uppercase tracking-[0.16em] text-subtle">
            {date}
          </p>
        ) : null}
      </GlassPanel>
    </Reveal>
  );
}

/* ── CertificationCard ─────────────────────────────────────────────────────── */

export interface CertificationCardProps {
  item: Certification;
  /** Scroll-reveal stagger for this card. */
  delay?: number;
}

/** One row of the credential meta strip. Only ever built from non-null values. */
interface CredentialField {
  term: string;
  value: string;
  /** Mono treatment for machine-ish values such as a credential id. */
  mono?: boolean;
}

/**
 * One credential. The name is the card; anything the data actually states about
 * it collects in a strip pinned to the bottom edge, above a hairline.
 *
 * `h-full` keeps every card in the pair the same height, so the certification
 * with no issuer reads as deliberately quiet rather than as a card that failed to
 * load. The card is not a link and does not lift on hover — there is nothing to
 * click unless a `credentialUrl` exists, and then the link is the link.
 */
export function CertificationCard({ item, delay = 0 }: CertificationCardProps) {
  const headingId = `recognition-${item.id}-name`;
  const { issuer, issued, credentialId, credentialUrl } = item;

  /**
   * Built by inclusion, not by placeholder: an unstated field contributes no row
   * at all. Today this yields one row for the certification that names an
   * educator and none for the other.
   */
  const fields: CredentialField[] = [];
  if (issuer !== null) {
    fields.push({ term: ISSUER_TERM, value: issuer });
  }
  if (issued !== null) {
    fields.push({ term: ISSUED_TERM, value: issued });
  }
  if (credentialId !== null) {
    fields.push({ term: CREDENTIAL_ID_TERM, value: credentialId, mono: true });
  }

  const hasMeta = fields.length > 0 || credentialUrl !== null;

  return (
    <Reveal as="li" delay={delay} shift={16}>
      <GlassPanel
        as="article"
        level={2}
        sheen
        rim
        aria-labelledby={headingId}
        className="flex h-full flex-col rounded-card p-6 md:p-7"
      >
        {/* `min-w-0` + anywhere-wrapping keep a long credential name inside the
         * card at 320px instead of widening the grid track. */}
        <h3
          id={headingId}
          className="text-h3 min-w-0 text-text [overflow-wrap:anywhere]"
        >
          {item.name}
        </h3>

        {hasMeta ? (
          <div className="mt-auto pt-8">
            <span aria-hidden="true" className="hairline-x block" />

            {fields.length > 0 ? (
              <dl className="mt-5 space-y-3">
                {fields.map((field) => (
                  <div key={field.term}>
                    <dt className="font-mono text-micro uppercase tracking-[0.16em] text-subtle">
                      {field.term}
                    </dt>
                    <dd
                      className={cn(
                        "mt-2 text-small text-text [overflow-wrap:anywhere]",
                        field.mono === true && "font-mono",
                      )}
                    >
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {/* Null for every credential today, so no anchor is rendered and
             * nothing here is focusable. Gated on a real URL, never on "#". */}
            {credentialUrl !== null ? (
              <a
                href={credentialUrl}
                aria-label={`${VERIFY_LABEL} ${item.name}`}
                {...(isExternal(credentialUrl)
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className={cn(
                  "mt-4 inline-flex min-h-11 items-center gap-2",
                  "font-mono text-micro uppercase tracking-[0.16em] text-muted",
                  "transition-colors duration-[var(--dur-base)] ease-[var(--ease-spatial)]",
                  "hover:text-text",
                )}
              >
                {VERIFY_LABEL}
                <span aria-hidden="true" className="text-accent">
                  ↗
                </span>
              </a>
            ) : null}
          </div>
        ) : null}
      </GlassPanel>
    </Reveal>
  );
}
