"use client";

/**
 * Reveals its children once they scroll into view: a short upward drift paired
 * with a fade, using the shared spatial easing.
 *
 * Behaviour guarantees:
 *   • With JavaScript disabled, a `<noscript>` rule in `layout.tsx` forces every
 *     `[data-reveal]` element visible — content is never hidden by animation.
 *   • Under `prefers-reduced-motion`, the CSS layer resolves the element to its
 *     final state immediately.
 *   • Fires once, then stops observing.
 */

import { createElement, type ReactNode } from "react";
import { useInView } from "@/lib/hooks";
import { cn } from "@/lib/cn";

type RevealTag = "div" | "section" | "article" | "li" | "span" | "header" | "p";

interface RevealProps {
  children: ReactNode;
  /** Stagger in milliseconds. Keep cumulative stagger under ~400ms per group. */
  delay?: number;
  /** Vertical travel distance. Smaller for dense lists, larger for headings. */
  shift?: number;
  className?: string;
  as?: RevealTag;
  /** Shrinks the trigger area — see `useInView`. */
  rootMargin?: string;
}

export function Reveal({
  children,
  delay = 0,
  shift = 20,
  className,
  as = "div",
  rootMargin,
}: RevealProps) {
  const [ref, inView] = useInView<HTMLElement>(rootMargin);

  return createElement(
    as,
    {
      ref,
      "data-reveal": inView ? "shown" : "pending",
      className: cn(className),
      style: {
        "--reveal-delay": `${delay}ms`,
        "--reveal-shift": `${shift}px`,
      } as React.CSSProperties,
    },
    children,
  );
}

/**
 * Convenience wrapper for revealing a list of siblings with an even stagger.
 * Caps the per-item delay so long lists never leave the last item waiting.
 */
export function RevealGroup({
  children,
  step = 70,
  maxDelay = 420,
  className,
  as = "div",
  itemAs = "div",
  shift = 16,
}: {
  children: ReactNode[];
  step?: number;
  maxDelay?: number;
  className?: string;
  as?: RevealTag;
  itemAs?: RevealTag;
  shift?: number;
}) {
  return createElement(
    as,
    { className: cn(className) },
    children.map((child, i) => (
      <Reveal
        key={i}
        as={itemAs}
        delay={Math.min(i * step, maxDelay)}
        shift={shift}
      >
        {child}
      </Reveal>
    )),
  );
}
