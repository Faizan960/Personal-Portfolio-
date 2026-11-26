"use client";

/**
 * Footer — the quiet end of the page, not a second navigation.
 *
 * Three things only: the wordmark, the three social links, a copyright line.
 * Structure comes from one gradient hairline plus whitespace — no glass panel,
 * because nothing here groups into a surface. Desktop is a single row (identity
 * left, links right); mobile stacks and turns the links into a vertical list so
 * every target clears 44px.
 *
 * Links follow the same contract as Contact: a `null` href is never rendered as
 * an anchor. Pending entries become plain, non-focusable text with an explicit
 * "Pending" tag — status is carried by words, not by colour alone.
 */

import { useEffect, useState } from "react";
import { usePublicPortfolio } from "@/lib/portfolio/publicContext";
import { Reveal } from "@/components/primitives/Reveal";
import { cn } from "@/lib/cn";

export function Footer() {
  const { draft } = usePublicPortfolio();
  const { personal, social } = draft;
  /**
   * Tradeoff: the year is read on the client after mount rather than at build
   * time, because this is a static export — a build-time year would silently go
   * stale on 1 January until someone redeployed. Starting from `null` keeps the
   * server HTML and the first client render byte-identical, so there is no
   * hydration mismatch across a New Year boundary; the numerals simply arrive
   * one frame late into space already reserved for them.
   */
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer>
      <div className="shell">
        {/* Single divider: the gradient hairline fades at the gutters, so the
            page ends softly instead of being cut off by a hard rule. */}
        <div aria-hidden="true" className="hairline-x" />

        <Reveal
          className="flex flex-col gap-10 py-12 sm:flex-row sm:items-end sm:justify-between sm:gap-8 md:py-14"
          shift={14}
        >
          {/* ── Identity ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-h4 text-text">{personal.name}</p>

            {/* `subtle` (4.6:1), not `faint` (~2.4:1) — this line carries real
                text, and the theme reserves `faint` for decoration only. */}
            <p className="mt-2.5 text-micro text-subtle">
              {/* The year sits in its own mono box: tabular numerals plus a
                  reserved 4ch means the post-mount fill-in shifts nothing. */}
              <span className="font-mono">&copy;</span>{" "}
              <span className="inline-block min-w-[4ch] font-mono">
                {year ?? ""}
              </span>{" "}
              {personal.name}
            </p>
          </div>

          {/* ── Social ───────────────────────────────────────────────────── */}
          <ul
            aria-label="Social links"
            className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-7"
          >
            {social.map((link, index) => (
              <Reveal
                key={link.id}
                as="li"
                delay={Math.min(80 + index * 70, 420)}
                shift={10}
              >
                {link.href ? (
                  <a
                    href={link.href}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-hairline text-small",
                      "text-muted transition-colors duration-[var(--dur-base)] ease-[var(--ease-spatial)]",
                      "hover:text-text",
                    )}
                  >
                    {link.label}
                  </a>
                ) : (
                  /* Pending: a span, so it is unreachable by keyboard and never
                     promises a destination the data file does not have yet. */
                  <span className="inline-flex min-h-11 items-center gap-2.5 text-small text-subtle">
                    {link.label}
                    {/* `subtle`, not `faint`: this word is the only carrier of
                        the pending status, so it has to clear AA contrast. The
                        well, mono face and caps keep it secondary to the label
                        without leaning on colour to do it. */}
                    <span className="glass-well rounded-hairline px-1.5 py-0.5 font-mono text-micro uppercase tracking-[0.16em] text-subtle">
                      Pending
                    </span>
                  </span>
                )}
              </Reveal>
            ))}
          </ul>
        </Reveal>
      </div>
    </footer>
  );
}
