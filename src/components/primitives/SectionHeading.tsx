"use client";

/**
 * Section heading block — kicker + heading, with a numbered index and a
 * hairline rule. Every section on the page shares this exact rhythm.
 */

import { Reveal } from "@/components/primitives/Reveal";
import { cn } from "@/lib/cn";

export interface SectionHeadingProps {
  kicker: string;
  /** Full heading text, e.g. "Selected Work". */
  heading: string;
  /** Optional index rendered as a small mono numeral before the kicker. */
  index?: string;
  className?: string;
  id?: string;
}

export function SectionHeading({
  kicker,
  heading,
  index,
  className,
  id,
}: SectionHeadingProps) {
  return (
    <Reveal as="header" className={cn("mb-12 md:mb-16", className)}>
      <div className="flex items-baseline gap-4">
        {index ? (
          <span
            aria-hidden="true"
            className="font-mono text-small text-faint"
          >
            {index}
          </span>
        ) : null}
        <p className="kicker">{kicker}</p>
        <span aria-hidden="true" className="hairline-x flex-1" />
      </div>
      <h2
        id={id}
        className="text-h2 mt-5 text-text max-w-[20ch] md:max-w-[24ch]"
      >
        {heading}
      </h2>
    </Reveal>
  );
}
