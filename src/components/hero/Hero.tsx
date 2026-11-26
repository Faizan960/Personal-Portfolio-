/**
 * Hero section.
 *
 * Desktop: a 12-column grid — text occupies the left seven, the Digital Core
 * the right five, with the core allowed to bleed slightly past the content
 * column so it reads as an object in space rather than a boxed illustration.
 *
 * Mobile: the layout is rebuilt rather than stacked — text first at full width,
 * then a deliberately smaller core beneath it. The core never dominates a small
 * viewport, and never pushes the CTAs below the fold.
 *
 * Server component; only its two children are interactive.
 */

import { DigitalCore } from "./DigitalCore";
import { HeroContent } from "./HeroContent";

export function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative flex min-h-[100svh] items-center pb-20 pt-28 md:pb-28 md:pt-32"
    >
      <h2 id="hero-heading" className="sr-only">
        Introduction
      </h2>

      <div className="shell shell-wide w-full">
        <div className="grid grid-cols-1 items-center gap-14 md:gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7 xl:col-span-6">
            <HeroContent />
          </div>

          {/* Digital Core — right visual column */}
          <div className="lg:col-span-5 xl:col-span-6">
            <div className="mx-auto w-[min(84vw,24rem)] md:w-[min(60vw,28rem)] lg:mr-0 lg:w-full lg:max-w-[34rem] xl:max-w-[38rem]">
              <DigitalCore />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll affordance — hidden on short viewports where it would collide. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-8 hidden justify-center lg:flex"
      >
        <span className="kicker kicker-muted">Scroll</span>
      </div>
    </section>
  );
}
