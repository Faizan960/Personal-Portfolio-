"use client";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DIGITAL CORE
 * ─────────────────────────────────────────────────────────────────────────────
 * The hero's signature visual: one object, composed of CSS glass layers wrapped
 * around a canvas-rendered geodesic lattice.
 *
 * Interaction: the pointer's position over the viewport sets a rotation target.
 * The canvas rotates its geometry toward it while the CSS shell tilts as a rigid
 * body, and the specular highlight slides across the surface. Because the shell
 * and the lattice respond at slightly different rates, the parallax between
 * them reads as genuine depth.
 *
 * Degradation ladder, in order:
 *   reduced motion  → one static, well-lit frame; no loop, no pointer tracking
 *   touch / coarse  → slow ambient drift only; no pointer tracking
 *   no 2D context   → CSS shell, halo and nucleus still render a credible object
 *   scrolled away   → render loop stopped entirely
 *   tab hidden      → render loop stopped entirely
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from "react";
import { createDigitalCore, type CoreHandle } from "@/lib/digitalCore";
import { useIsVisible, useReducedMotion } from "@/lib/hooks";

/** Maximum tilt of the CSS shell, in degrees, at full pointer deflection. */
const TILT_MAX = 7;
/** Per-frame approach rate for the shell tilt. Softer than the canvas. */
const TILT_DAMPING = 0.07;
/** Below this change per frame the damping loop parks itself. */
const SETTLE_EPSILON = 0.02;

export function DigitalCore() {
  const stageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coreRef = useRef<CoreHandle | null>(null);

  const reducedMotion = useReducedMotion();
  const visible = useIsVisible(stageRef);

  /* ── Renderer lifecycle ─────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Read capability synchronously so the renderer is built once, correctly,
    // rather than being torn down and rebuilt after a hook settles.
    const compact = window.matchMedia("(max-width: 767px)").matches;

    const core = createDigitalCore(canvas, {
      detail: compact ? 1 : 2,
      staticFrame: reducedMotion,
    });

    coreRef.current = core;
    return () => {
      core.destroy();
      coreRef.current = null;
    };
  }, [reducedMotion]);

  /* ── Pause when off-screen or backgrounded ──────────────────────────────── */

  useEffect(() => {
    const core = coreRef.current;
    if (!core || reducedMotion) return;

    const sync = () => {
      core.setRunning(visible && !document.hidden);
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [visible, reducedMotion]);

  /* ── Pointer tracking ───────────────────────────────────────────────────────
   * One rAF loop damps the shell tilt and parks itself once the motion settles,
   * so an idle page runs no tilt work at all. Values go straight to the style
   * attribute — a moving cursor never causes a React re-render.
   */
  useEffect(() => {
    if (reducedMotion) return;

    // Cursor tracking is meaningless without a precise pointer; on touch the
    // canvas's own ambient drift carries the visual instead.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return;

    const stage = stageRef.current;
    const body = bodyRef.current;
    if (!stage || !body) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;

    const step = () => {
      const deltaX = targetX - currentX;
      const deltaY = targetY - currentY;

      currentX += deltaX * TILT_DAMPING;
      currentY += deltaY * TILT_DAMPING;

      body.style.setProperty("--tilt-y", `${(currentX * TILT_MAX).toFixed(3)}deg`);
      body.style.setProperty("--tilt-x", `${(-currentY * TILT_MAX).toFixed(3)}deg`);

      // Slide the specular highlight toward the cursor.
      stage.style.setProperty("--mx", `${(50 + currentX * 22).toFixed(2)}%`);
      stage.style.setProperty("--my", `${(34 + currentY * 18).toFixed(2)}%`);

      // Park the loop once we've effectively arrived.
      if (Math.abs(deltaX) < SETTLE_EPSILON && Math.abs(deltaY) < SETTLE_EPSILON) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(step);
    };

    const wake = () => {
      if (frame === 0) frame = requestAnimationFrame(step);
    };

    const onMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;

      // Normalise against half the viewport, so full deflection sits at the
      // screen edges and ordinary cursor movement stays subtle.
      const nx = (event.clientX - originX) / (window.innerWidth / 2);
      const ny = (event.clientY - originY) / (window.innerHeight / 2);

      targetX = Math.max(-1, Math.min(1, nx));
      targetY = Math.max(-1, Math.min(1, ny));

      coreRef.current?.setPointer(targetX, targetY);
      wake();
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      coreRef.current?.clearPointer();
      wake();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  /* ── Markup ─────────────────────────────────────────────────────────────── */

  return (
    <div
      ref={stageRef}
      className="core-stage"
      role="img"
      aria-label="Digital Core — an abstract translucent sphere containing a geodesic lattice, the visual identity of this portfolio."
    >
      {/* Ambient bloom bleeding past the sphere's edge. */}
      <div className="core-halo" aria-hidden="true" />

      {/* The tilting body. One transform moves every layer inside it. */}
      <div ref={bodyRef} className="core-body" aria-hidden="true">
        <div className="core-shell" />
        <canvas ref={canvasRef} className="core-canvas" />
        <div className="core-shell-inner" />
        <div className="core-ring" />
        <div className="core-nucleus" />
      </div>

      {/* Outside the tilting body: the highlight belongs to the viewer's light,
          not to the object, so it must not rotate with it. */}
      <div className="core-specular" aria-hidden="true" />
    </div>
  );
}
