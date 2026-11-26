"use client";

/**
 * Hero text column. Hierarchy runs: status → name → thesis → scope → actions.
 * The name is the only element on the page using the display scale, and the
 * only one using the `.text-lit` treatment.
 */

import { usePublicPortfolio } from "@/lib/portfolio/publicContext";
import { MagneticButton } from "@/components/primitives/Button";
import { Reveal } from "@/components/primitives/Reveal";

export function HeroContent() {
  const { draft } = usePublicPortfolio();
  const { hero, personal } = draft;
  return (
    <div className="relative z-10 flex flex-col items-start">
      {/* Status pill — states the role without spending display type on it. */}
      <Reveal delay={0} shift={12}>
        <p className="glass-1 inline-flex items-center gap-2.5 rounded-full py-1.5 pl-3 pr-4">
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full bg-live motion-safe:animate-pulse-dot"
          />
          <span className="text-small text-muted">{personal.role}</span>
        </p>
      </Reveal>

      {/* The name. Dominant, but deliberately short of filling the viewport. */}
      <Reveal delay={80} shift={22} as="div">
        <h1 className="text-display text-lit mt-7 max-w-[11ch]">
          {personal.name}
        </h1>
      </Reveal>

      {/* The thesis line — the single sentence the site is built around. */}
      <Reveal delay={150} shift={18} as="div">
        <p className="text-h3 mt-6 max-w-[22ch] text-text">
          {personal.statement}
        </p>
      </Reveal>

      {/* Scope. Muted, so it supports the thesis rather than competing. */}
      <Reveal delay={210} shift={16} as="div">
        <p className="text-lead measure-tight mt-5 text-muted">
          {personal.descriptor}
        </p>
      </Reveal>

      {/* Actions. */}
      <Reveal delay={280} shift={14} as="div">
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <MagneticButton
            variant="primary"
            href={`#${hero.primaryCta.targetId}`}
          >
            {hero.primaryCta.label}
            <span aria-hidden="true" className="text-accent">
              →
            </span>
          </MagneticButton>

          <MagneticButton
            variant="secondary"
            href={`#${hero.secondaryCta.targetId}`}
          >
            {hero.secondaryCta.label}
          </MagneticButton>
        </div>
      </Reveal>
    </div>
  );
}
