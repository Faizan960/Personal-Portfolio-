"use client";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * NAVIGATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Desktop: a floating glass bar that condenses once the page scrolls. The active
 * section is marked by a pill that slides between items — the position is
 * measured from the live DOM, so it stays correct at any font size or zoom.
 *
 * Mobile: a compact bar plus a full-height glass sheet. The sheet is a modal
 * dialog and behaves like one — focus moves in on open, is trapped while open,
 * Escape closes, background scroll is locked, and focus returns to the trigger.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { navSections, personal } from "@/data/portfolio";
import {
  useScrolledPast,
  useScrollSpy,
  useScrollToSection,
} from "@/lib/hooks";
import { cn } from "@/lib/cn";

const SECTION_IDS = navSections.map((section) => section.id);

export function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const condensed = useScrolledPast(24);
  const active = useScrollSpy(SECTION_IDS);
  const scrollTo = useScrollToSection();

  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  /* ── Desktop sliding indicator ────────────────────────────────────────────
   * Measured rather than hard-coded: the pill reads the active link's real box,
   * so it survives zoom, font fallback and translated labels.
   */
  const listRef = useRef<HTMLUListElement>(null);
  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
  } | null>(null);

  const measureIndicator = useCallback(() => {
    const list = listRef.current;
    if (!list || !active) {
      setIndicator(null);
      return;
    }

    const item = list.querySelector<HTMLElement>(`[data-nav-id="${active}"]`);
    if (!item) {
      setIndicator(null);
      return;
    }

    setIndicator({ left: item.offsetLeft, width: item.offsetWidth });
  }, [active]);

  useEffect(() => {
    measureIndicator();
    window.addEventListener("resize", measureIndicator);
    return () => window.removeEventListener("resize", measureIndicator);
  }, [measureIndicator]);

  /* ── Sheet: scroll lock, Escape, focus management ───────────────────────── */

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;

    // Compensate for the removed scrollbar so the page doesn't shift sideways.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab") return;

      // Trap focus inside the sheet.
      const sheet = sheetRef.current;
      if (!sheet) return;

      const focusable = sheet.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    // Move focus into the sheet once it has painted.
    const raf = requestAnimationFrame(() => {
      sheetRef.current
        ?.querySelector<HTMLElement>("a[href], button")
        ?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(raf);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [menuOpen, closeMenu]);

  const handleNavigate = (id: string) => {
    /* On a sub-route such as `/work/gramcare/` none of these sections exist on
     * the page, so a same-page scroll would silently do nothing — and the click
     * handler has already prevented the default hash navigation. Fall back to a
     * real navigation to the home page's anchor. */
    if (document.getElementById(id) === null) {
      window.location.href = `/#${id}`;
      return;
    }

    setMenuOpen(false);
    // Let the sheet's unmount settle before scrolling, so the scroll lock is
    // released first and the browser lands on the right offset.
    requestAnimationFrame(() => scrollTo(id));
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <>
      {/* Keyboard users get a way past the nav on first Tab. Targets the `<main>`
       * landmark rather than a section id, so it works on every route — a
       * `#about` target would be dead on a case-study page. */}
      <a
        href="#main"
        className="sr-only-focusable glass-2 fixed left-4 top-4 rounded-control px-4 py-2 text-small"
        style={{ zIndex: "var(--z-modal)" }}
      >
        Skip to content
      </a>

      <header
        className="fixed inset-x-0 top-0"
        style={{ zIndex: "var(--z-nav)" }}
      >
        <div className="shell shell-wide">
          <nav
            aria-label="Primary"
            className={cn(
              "glass-1 glass-rim mt-3 flex items-center justify-between rounded-full",
              "transition-[padding,margin,border-color] duration-[var(--dur-slow)] ease-[var(--ease-spatial)]",
              condensed ? "mt-2 py-2 pl-5 pr-2.5" : "py-2.5 pl-6 pr-3",
            )}
          >
            {/* Wordmark */}
            <a
              href="#hero"
              onClick={(event) => {
                event.preventDefault();
                handleNavigate("hero");
              }}
              className="text-small font-medium tracking-[0.2em] text-text transition-opacity duration-[var(--dur-base)] hover:opacity-70"
            >
              {personal.wordmark}
            </a>

            {/* Desktop links */}
            <ul
              ref={listRef}
              className="relative hidden items-center gap-1 md:flex"
            >
              {/* Sliding active indicator */}
              <li
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-y-0 rounded-full",
                  "bg-[rgb(255_255_255/0.07)]",
                  "transition-[opacity,transform,width] duration-[var(--dur-slow)] ease-[var(--ease-spatial)]",
                )}
                style={{
                  opacity: indicator ? 1 : 0,
                  transform: `translateX(${indicator?.left ?? 0}px)`,
                  width: indicator?.width ?? 0,
                }}
              />

              {navSections.map((section) => {
                const isActive = active === section.id;
                return (
                  <li key={section.id} data-nav-id={section.id}>
                    <a
                      href={`#${section.id}`}
                      aria-current={isActive ? "true" : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        handleNavigate(section.id);
                      }}
                      className={cn(
                        "relative block rounded-full px-3.5 py-1.5 text-small",
                        "transition-colors duration-[var(--dur-base)]",
                        isActive
                          ? "text-text"
                          : "text-subtle hover:text-muted",
                      )}
                    >
                      {section.label}
                    </a>
                  </li>
                );
              })}
            </ul>

            {/* Mobile trigger */}
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
              className="glass-1 flex size-9 items-center justify-center rounded-full md:hidden"
            >
              <MenuGlyph open={menuOpen} />
            </button>

            {/* Desktop CTA keeps the bar balanced and gives contact a shortcut. */}
            <a
              href="#contact"
              onClick={(event) => {
                event.preventDefault();
                handleNavigate("contact");
              }}
              className="glass-1 hidden rounded-full px-4 py-1.5 text-small text-muted transition-colors duration-[var(--dur-base)] hover:text-text md:block"
            >
              Get in touch
            </a>
          </nav>
        </div>
      </header>

      {/* ── Mobile sheet ───────────────────────────────────────────────────── */}
      {menuOpen ? (
        <div
          className="fixed inset-0 md:hidden"
          style={{ zIndex: "var(--z-overlay)" }}
        >
          {/* Scrim */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="absolute inset-0 bg-[rgb(3_4_7/0.72)] backdrop-blur-sm"
          />

          <div
            ref={sheetRef}
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="glass-3 absolute inset-x-3 top-3 rounded-feature p-5"
          >
            <div className="flex items-center justify-between">
              <span className="kicker kicker-muted">Menu</span>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className="glass-1 flex size-9 items-center justify-center rounded-full"
              >
                <MenuGlyph open />
              </button>
            </div>

            <ul className="mt-6 flex flex-col">
              {navSections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={active === section.id ? "true" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      handleNavigate(section.id);
                    }}
                    className={cn(
                      "flex items-baseline gap-4 border-t py-4 text-h3",
                      "border-[var(--hairline-faint)] transition-colors duration-[var(--dur-base)]",
                      active === section.id ? "text-text" : "text-muted",
                    )}
                  >
                    {/* The section's own numeral, from the data — not the item's
                     * position in this list. The nav is a subset of the page, so
                     * counting rows here would contradict the section headings. */}
                    <span
                      aria-hidden="true"
                      className="font-mono text-micro text-faint"
                    >
                      {section.index}
                    </span>
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * Two-line menu glyph that crosses into an X. Drawn with spans rather than an
 * icon font or SVG sprite so it inherits colour and needs no extra request.
 */
function MenuGlyph({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className="relative block size-3.5">
      <span
        className={cn(
          "absolute left-0 block h-px w-full bg-text",
          "transition-transform duration-[var(--dur-base)] ease-[var(--ease-spatial)]",
          open ? "top-1/2 rotate-45" : "top-[3px]",
        )}
      />
      <span
        className={cn(
          "absolute left-0 block h-px w-full bg-text",
          "transition-transform duration-[var(--dur-base)] ease-[var(--ease-spatial)]",
          open ? "top-1/2 -rotate-45" : "bottom-[3px]",
        )}
      />
    </span>
  );
}
