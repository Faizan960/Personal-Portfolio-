/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AMBIENT BACKGROUND
 * ─────────────────────────────────────────────────────────────────────────────
 * The atmosphere the whole interface sits in. Five stacked layers, all at very
 * low opacity — individually none should be identifiable, together they create
 * depth without competing with content.
 *
 *   1. Cool key light      top-left, the implied light source
 *   2. Deep fill           bottom-right, pushes the far corner back
 *   3. Warm bounce         centre, keeps the neutrals from going cold and dead
 *   4. Structural grid     barely-there technical texture
 *   5. Film grain          breaks up gradient banding on wide-gamut displays
 *   6. Vignette            settles the edges
 *
 * Entirely CSS. No canvas, no JS, no repaint cost after first paint.
 * `fixed` + `pointer-events-none` + `aria-hidden` throughout.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* Fractal-noise grain as an inline SVG data URI — no network request, ~300 bytes. */
const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: "var(--z-ambient)" }}
    >
      {/* 1 — Cool key light, upper left. The implied sun. */}
      <div
        className="absolute -left-[18%] -top-[24%] h-[78vh] w-[78vw] rounded-full motion-safe:animate-drift"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, var(--ambient-cool), transparent 68%)",
          filter: "blur(24px)",
        }}
      />

      {/* 2 — Deep fill, lower right. Recedes. */}
      <div
        className="absolute -bottom-[28%] -right-[16%] h-[72vh] w-[68vw] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, var(--ambient-deep), transparent 70%)",
          filter: "blur(30px)",
        }}
      />

      {/* 3 — Warm bounce through the middle. Stops the palette going lifeless. */}
      <div
        className="absolute left-1/2 top-[42%] h-[52vh] w-[92vw] -translate-x-1/2 rounded-[50%]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, var(--ambient-warm), transparent 72%)",
          filter: "blur(40px)",
        }}
      />

      {/* 4 — Structural grid. Technical texture, almost subliminal. */}
      <div
        className="absolute inset-0"
        style={{
          opacity: "var(--grid-opacity)",
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "92px 92px",
          // Fade the grid out toward the edges so it never reads as a table.
          maskImage:
            "radial-gradient(ellipse 90% 70% at 50% 30%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 70% at 50% 30%, black, transparent)",
        }}
      />

      {/* 5 — Film grain. Kills banding across the large dark gradients. */}
      <div
        className="absolute inset-0"
        style={{
          opacity: "var(--grain-opacity)",
          backgroundImage: GRAIN_URL,
          backgroundRepeat: "repeat",
        }}
      />

      {/* 6 — Vignette. Focuses the centre of the viewport. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 50% 40%, transparent 45%, rgb(0 0 0 / 0.5) 100%)",
        }}
      />
    </div>
  );
}
