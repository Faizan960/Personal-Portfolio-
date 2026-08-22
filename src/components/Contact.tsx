"use client";

/**
 * Contact — the closing call to action.
 *
 * The one place on the page a level-3 panel is justified: a single focal surface
 * holding the statement and actions on the left, the channel list on the right.
 *
 * CONTENT INTEGRITY
 * Every channel in the data file currently has `handle: null` and `href: null`,
 * so nothing here may fabricate an address. A row with no `href` renders as a
 * plain, non-focusable element with a recessed "reserved" slot where the handle
 * will sit — never an `<a>`, never `href="#"`, never a dead link. The moment a
 * real `href` lands in the data file the same row becomes a real anchor, with
 * `target="_blank"` for http(s) and no target for `mailto:`.
 */

import { contact, personal } from "@/data/portfolio";
import { MagneticButton } from "@/components/primitives/Button";
import { GlassPanel } from "@/components/primitives/GlassPanel";
import { Reveal } from "@/components/primitives/Reveal";
import { Section } from "@/components/primitives/Section";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { cn } from "@/lib/cn";

/**
 * Control/status labels with no corresponding data field — UI chrome in the same
 * category as the "Details" label in `About`, not portfolio content.
 */
const CHANNELS_LABEL = "Channels";
const PENDING_LABEL = "Pending";
const PENDING_SR_TEXT = "not yet available";
const RESUME_LABEL = "Résumé";

/** Only http(s) destinations get a new tab; `mailto:` and local paths must not. */
function isExternal(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

export function Contact() {
  // Guarded lookup — `find` is `SocialLink | undefined`, and the href may be null.
  const emailLink = contact.links.find((link) => link.id === "email");
  const emailHref = emailLink?.href ?? null;
  const resumeHref = personal.resumeHref;

  // The actions row disappears entirely rather than rendering an empty shelf.
  const hasActions = Boolean(emailHref) || Boolean(resumeHref);

  return (
    <Section id="contact" labelledBy="contact-heading">
      <SectionHeading
        index="08"
        kicker={contact.kicker}
        heading={contact.heading}
        id="contact-heading"
      />

      <Reveal shift={22}>
        <GlassPanel
          level={3}
          sheen
          rim
          className="rounded-feature p-6 sm:p-8 md:p-10 lg:p-12"
        >
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            {/* ── Statement + actions ───────────────────────────────────── */}
            <div className="lg:col-span-5">
              <p className="text-lead measure-tight text-text">
                {contact.statement}
              </p>

              {hasActions ? (
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {/* Primary CTA exists only once a real address is supplied. */}
                  {emailLink && emailHref ? (
                    <MagneticButton
                      variant="primary"
                      href={emailHref}
                      {...(isExternal(emailHref)
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {emailLink.handle ?? emailLink.label}
                      <span aria-hidden="true" className="text-accent">
                        →
                      </span>
                    </MagneticButton>
                  ) : null}

                  {resumeHref ? (
                    <MagneticButton
                      variant="secondary"
                      href={resumeHref}
                      {...(isExternal(resumeHref)
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {RESUME_LABEL}
                    </MagneticButton>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* ── Channels ──────────────────────────────────────────────── */}
            <div className="lg:col-span-6 lg:col-start-7">
              <p id="contact-channels-label" className="kicker kicker-muted">
                {CHANNELS_LABEL}
              </p>

              <ul aria-labelledby="contact-channels-label" className="mt-2">
                {contact.links.map((link, index) => {
                  // Destructured to locals so `href` narrowing is stable inside JSX.
                  const { label, handle, href } = link;
                  /** Spec: show the handle when present, else fall back to the label. */
                  const detail = handle ?? label;
                  const ordinal = String(index + 1).padStart(2, "0");

                  return (
                    <Reveal
                      key={link.id}
                      as="li"
                      delay={Math.min(index * 70, 420)}
                      shift={14}
                      className={cn(
                        index > 0 && "border-t border-[var(--hairline-faint)]",
                      )}
                    >
                      {href ? (
                        <a
                          href={href}
                          /* Named off the handle when there is one; bare label
                           * otherwise, so a half-filled entry (href set, handle
                           * still null) never announces as "Email: Email". */
                          aria-label={handle ? `${label}: ${handle}` : label}
                          {...(isExternal(href)
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                          className={cn(
                            "group flex min-h-14 w-full flex-col items-start justify-center gap-1 py-3.5",
                            "sm:flex-row sm:items-center sm:justify-between sm:gap-4",
                            "transition-colors duration-[var(--dur-base)] ease-[var(--ease-spatial)]",
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <span
                              aria-hidden="true"
                              className="font-mono text-micro text-faint"
                            >
                              {ordinal}
                            </span>
                            <span className="text-h4 text-text">{label}</span>
                          </span>

                          <span className="flex min-w-0 items-center gap-2.5 sm:justify-end">
                            <span
                              aria-hidden="true"
                              className={cn(
                                "font-mono text-small text-muted",
                                // Long handles and URLs must break rather than
                                // push the row into horizontal overflow.
                                "[overflow-wrap:anywhere]",
                                "transition-colors duration-[var(--dur-base)] ease-[var(--ease-spatial)]",
                                "group-hover:text-accent",
                              )}
                            >
                              {detail}
                            </span>
                            <span
                              aria-hidden="true"
                              className={cn(
                                "shrink-0 text-small text-subtle",
                                "transition-transform duration-[var(--dur-base)] ease-[var(--ease-spatial)]",
                                isExternal(href)
                                  ? "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                  : "group-hover:translate-x-0.5",
                              )}
                            >
                              {isExternal(href) ? "↗" : "→"}
                            </span>
                          </span>
                        </a>
                      ) : (
                        /* Pending: a designed row, not a control. No href, no
                         * tabindex, nothing focusable — so keyboard users never
                         * land on a destination that does not exist yet. */
                        <div className="flex min-h-14 w-full flex-col items-start justify-center gap-1.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                          <span className="flex items-center gap-3">
                            <span
                              aria-hidden="true"
                              className="font-mono text-micro text-faint"
                            >
                              {ordinal}
                            </span>
                            <span className="text-h4 text-subtle">{label}</span>
                          </span>

                          {/* Recessed slot marking where the handle will go. */}
                          <span
                            aria-hidden="true"
                            className="glass-well inline-flex h-7 shrink-0 items-center gap-2 rounded-chip px-3"
                          >
                            <span className="size-1 rounded-full bg-faint" />
                            <span className="font-mono text-micro uppercase text-subtle">
                              {PENDING_LABEL}
                            </span>
                          </span>

                          {/* The visual marker above is decorative, so the state
                           * is spelled out here. It follows the label in reading
                           * order, announcing as "Email — not yet available",
                           * without repeating the label. */}
                          <span className="sr-only">{PENDING_SR_TEXT}</span>
                        </div>
                      )}
                    </Reveal>
                  );
                })}
              </ul>
            </div>
          </div>
        </GlassPanel>
      </Reveal>
    </Section>
  );
}
