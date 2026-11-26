"use client";

/**
 * About — an editorial spread rather than a text card.
 *
 * Structure: prose in the left seven columns behind a thin accent rule, factual
 * metadata in a panel on the right. The prose reads from an array, so extra
 * paragraphs can be appended in the data file with no layout work: the first
 * paragraph sets the lead size, the rest fall back to body size.
 */

import { usePublicPortfolio } from "@/lib/portfolio/publicContext";
import { getDefaultSectionsConfig } from "@/lib/cms/storage";
import { GlassPanel } from "@/components/primitives/GlassPanel";
import { Reveal } from "@/components/primitives/Reveal";
import { Section } from "@/components/primitives/Section";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { cn } from "@/lib/cn";

export function About() {
  const { draft } = usePublicPortfolio();
  const { about } = draft;
  const sectionSetting = (draft.sectionsConfig ?? getDefaultSectionsConfig()).sections.about;

  return (
    <Section id="about" labelledBy="about-heading">
      <SectionHeading
        index="01"
        kicker={about.kicker}
        heading={sectionSetting.headingOverride ?? about.heading}
        lead={sectionSetting.introOverride ?? undefined}
        id="about-heading"
      />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        {/* ── Prose ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7">
          <div className="relative pl-6 md:pl-8">
            {/* Editorial rule: a light source running down the margin. */}
            <span
              aria-hidden="true"
              className="absolute left-0 top-1 h-full w-px"
              style={{
                background:
                  "linear-gradient(to bottom, rgb(157 198 216 / 0.5), rgb(157 198 216 / 0.08) 38%, transparent 88%)",
              }}
            />

            <div className="measure space-y-6">
              {about.paragraphs.map((paragraph, index) => (
                <Reveal key={index} as="p" delay={index * 80} shift={16}>
                  <span
                    className={cn(
                      index === 0
                        ? "text-lead text-text"
                        : "text-body text-muted",
                    )}
                  >
                    {paragraph}
                  </span>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        {/* ── Metadata ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 xl:col-span-4 xl:col-start-9">
          <Reveal delay={120} shift={18}>
            <GlassPanel
              level={2}
              sheen
              rim
              className="rounded-card p-6 md:p-7"
            >
              <p className="kicker kicker-muted">Details</p>

              <dl className="mt-5">
                {about.metadata.map((entry, index) => (
                  <div
                    key={entry.label}
                    className={cn(
                      "flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6",
                      index > 0 && "border-t border-[var(--hairline-faint)]",
                    )}
                  >
                    <dt className="font-mono text-micro uppercase tracking-[0.16em] text-subtle">
                      {entry.label}
                    </dt>
                    <dd className="text-small text-text sm:text-right">
                      {entry.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </GlassPanel>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
