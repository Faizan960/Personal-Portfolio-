"use client";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * INTERACTION HOOKS
 * ─────────────────────────────────────────────────────────────────────────────
 * Every hook here is capability- and preference-aware. The rules they enforce:
 *
 *   • Nothing animates for users who prefer reduced motion.
 *   • Pointer-driven effects are skipped entirely on touch and coarse pointers,
 *     rather than being emulated badly.
 *   • All continuous work is coalesced into `requestAnimationFrame`, and every
 *     listener and frame is torn down on unmount.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";

/* ── Media queries ─────────────────────────────────────────────────────────── */

/**
 * Subscribes to a media query. Returns `false` during SSR and on first paint,
 * then settles after mount — so server and client markup always agree.
 */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** `true` when the user has asked the system to minimise animation. */
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** `true` only for a real hoverable, precise pointer — i.e. mouse or trackpad. */
export function useFinePointer(): boolean {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}

/** `true` below the 768px tablet breakpoint. */
export function useIsCompact(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/**
 * Combined gate for any cursor-driven embellishment: a precise pointer *and*
 * no reduced-motion preference.
 */
export function usePointerEffectsEnabled(): boolean {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  return fine && !reduced;
}

/* ── Scroll state ──────────────────────────────────────────────────────────── */

/**
 * `true` once the page has scrolled past `threshold` pixels. Used to condense
 * the navigation. Reads scroll position inside rAF to avoid layout thrash.
 */
export function useScrolledPast(threshold = 24): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    let frame = 0;
    let last = false;

    const measure = () => {
      frame = 0;
      const next = window.scrollY > threshold;
      if (next !== last) {
        last = next;
        setPast(next);
      }
    };

    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return past;
}

/**
 * Tracks which section is currently the visual focus of the viewport.
 *
 * Rather than "first intersecting element", this picks the candidate closest to
 * a sight-line ~38% down the viewport — which is where a reader's attention
 * actually sits, and which stops the indicator flickering between two adjacent
 * sections mid-scroll.
 *
 * @param ids Section element ids, in document order.
 * @returns The active id, or `null` before any section is reached.
 */
export function useScrollSpy(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const sightLine = window.innerHeight * 0.38;

      let bestId: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;

        const { top, bottom } = el.getBoundingClientRect();
        // Entirely off-screen: ignore.
        if (bottom < 0 || top > window.innerHeight) continue;

        // Distance from the section's leading edge to the sight-line. Sections
        // already scrolled past the line score by how far past they are.
        const distance = Math.abs(top - sightLine);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = id;
        }
      }

      // Near the very bottom of the page the last section should win outright,
      // otherwise a short final section can never become active.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) bestId = ids[ids.length - 1] ?? bestId;

      setActive((prev) => (prev === bestId ? prev : bestId));
    };

    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids]);

  return active;
}

/* ── Pointer-reactive surfaces ─────────────────────────────────────────────── */

/**
 * Writes the pointer's position over an element as `--mx` / `--my` custom
 * properties (in %), which the `.glass-sheen` material reads to move its
 * specular highlight.
 *
 * No React state is involved — values go straight to the style attribute inside
 * rAF, so a moving cursor never triggers a re-render.
 */
export function usePointerSurface<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const enabled = usePointerEffectsEnabled();

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let frame = 0;
    let px = 0;
    let py = 0;

    const apply = () => {
      frame = 0;
      el.style.setProperty("--mx", `${px}%`);
      el.style.setProperty("--my", `${py}%`);
    };

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      px = ((event.clientX - rect.left) / rect.width) * 100;
      py = ((event.clientY - rect.top) / rect.height) * 100;
      if (frame === 0) frame = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return ref;
}

/**
 * Subtle magnetic attraction toward the cursor, for CTAs.
 *
 * Displacement is `offsetFromCentre × strength`, capped at `maxOffset` px, so
 * the control never detaches from its slot — it leans, it does not fly.
 *
 * @param strength Fraction of the cursor offset to follow (default 0.16).
 * @param maxOffset Hard cap on displacement in pixels (default 8).
 */
export function useMagnetic<T extends HTMLElement>(
  strength = 0.16,
  maxOffset = 8,
) {
  const ref = useRef<T | null>(null);
  const enabled = usePointerEffectsEnabled();

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let frame = 0;
    let tx = 0;
    let ty = 0;

    const apply = () => {
      frame = 0;
      el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
    };

    const clamp = (value: number) =>
      Math.max(-maxOffset, Math.min(maxOffset, value));

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      tx = clamp((event.clientX - (rect.left + rect.width / 2)) * strength);
      ty = clamp((event.clientY - (rect.top + rect.height / 2)) * strength);
      if (frame === 0) frame = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      tx = 0;
      ty = 0;
      el.style.transform = "";
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    // A focused control must sit in its true position for the ring to align.
    el.addEventListener("blur", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("blur", onLeave);
      if (frame) cancelAnimationFrame(frame);
      el.style.transform = "";
    };
  }, [enabled, strength, maxOffset]);

  return ref;
}

/* ── Viewport entry ────────────────────────────────────────────────────────── */

/**
 * Fires once when an element first enters the viewport, then disconnects.
 *
 * Falls back to "visible immediately" when IntersectionObserver is missing, so
 * content is never trapped behind an unsupported API.
 *
 * @param rootMargin Shrinks the trigger area; the default waits until the
 *   element is ~12% into view before revealing.
 */
export function useInView<T extends HTMLElement>(
  rootMargin = "0px 0px -12% 0px",
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, inView];
}

/**
 * Reports whether an element is currently on screen, and keeps reporting.
 * Used to pause the Digital Core's render loop while the hero is scrolled away.
 */
export function useIsVisible<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setVisible(entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return visible;
}

/* ── Smooth anchor navigation ──────────────────────────────────────────────── */

/**
 * Returns a scroll handler for in-page anchors that respects reduced motion and
 * keeps the URL hash correct without the browser's instant jump.
 *
 * Focus is moved to the target section so keyboard and screen-reader users land
 * in the same place sighted users do.
 */
export function useScrollToSection() {
  const reduced = useReducedMotion();

  return useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;

      el.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });

      // Make the section programmatically focusable just long enough to receive
      // focus, so we don't leave a permanent tab stop behind.
      const hadTabIndex = el.hasAttribute("tabindex");
      if (!hadTabIndex) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
      if (!hadTabIndex) {
        el.addEventListener("blur", () => el.removeAttribute("tabindex"), {
          once: true,
        });
      }

      if (window.history.replaceState) {
        window.history.replaceState(null, "", `#${id}`);
      }
    },
    [reduced],
  );
}
