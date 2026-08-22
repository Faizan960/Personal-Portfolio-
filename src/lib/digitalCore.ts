/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DIGITAL CORE RENDERER
 * ─────────────────────────────────────────────────────────────────────────────
 * A small painter's-algorithm 3D renderer on a 2D canvas. It draws one object:
 * a geodesic lattice inside a translucent shell, lit by a single key light.
 *
 * Why this is cheap:
 *   • The mesh is built once, at module scope, and shared by every instance.
 *   • Per frame we transform ~162 vertices and stroke ~480 edges — trivial work
 *     next to standing up and compositing a WebGL context.
 *   • Rotation, projection and face normals are computed into pre-allocated
 *     scratch buffers, so the steady-state render loop allocates nothing and
 *     never triggers GC.
 *   • The loop is fully stopped when the hero leaves the viewport or the tab is
 *     hidden, and never starts at all under `prefers-reduced-motion`.
 *
 * Depth is sold by four cues:
 *   1. Perspective scale — nearer geometry projects larger
 *   2. Depth fog        — farther geometry fades toward the background
 *   3. Lambert shading  — faces angled into the key light are brighter
 *   4. Occlusion order  — far geometry is drawn first, so near struts overdraw
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { buildGeodesic, type Mesh, type Vec3 } from "./geodesic";

/* ── Tunables ──────────────────────────────────────────────────────────────── */

const CONFIG = {
  /** Camera distance in world units. Larger = flatter, weaker perspective. */
  cameraZ: 3.15,
  /** Focal length. With `cameraZ`, this sets the lens character. */
  focal: 2.5,
  /** Sphere radius as a fraction of the canvas's smaller side. */
  radius: 0.34,
  /** Idle rotation rate. Slow enough to read as "alive", never as "spinning". */
  ambientSpeed: 0.052,
  /** Radians of rotation at full pointer deflection. */
  pointerRange: 0.34,
  /** Per-frame approach rate toward the target rotation (higher = snappier). */
  damping: 0.055,
  /** Key light — upper-left-front, matching the ambient background's key. */
  light: { x: -0.5, y: -0.72, z: 0.48 },
  /** Cap DPR: past 2 the cost is real and the visible gain is not. */
  maxDpr: 2,
} as const;

const ACCENT = { r: 157, g: 198, b: 216 };
const WARM = { r: 224, g: 208, b: 180 };

/** Pre-normalised key light direction. */
const LIGHT = (() => {
  const { x, y, z } = CONFIG.light;
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
})();

/** Meshes are built once per detail level and shared across instances. */
const MESH_CACHE = new Map<number, Mesh>();

function getMesh(subdivisions: number): Mesh {
  let mesh = MESH_CACHE.get(subdivisions);
  if (!mesh) {
    mesh = buildGeodesic(subdivisions);
    MESH_CACHE.set(subdivisions, mesh);
  }
  return mesh;
}

/* ── Public API ────────────────────────────────────────────────────────────── */

export interface CoreHandle {
  /** Sets the normalised pointer target; both components in [-1, 1]. */
  setPointer(x: number, y: number): void;
  /** Clears pointer influence; the object drifts back to its idle attitude. */
  clearPointer(): void;
  /** Starts or stops the animation loop. Idempotent. */
  setRunning(running: boolean): void;
  /** Cancels any pending frame and disconnects observers. */
  destroy(): void;
}

export interface CoreOptions {
  /** Geodesic subdivisions: 1 for compact viewports, 2 for desktop. */
  detail?: number;
  /** When true, draws a single composed frame and starts no loop. */
  staticFrame?: boolean;
}

/* ── Renderer ──────────────────────────────────────────────────────────────── */

export function createDigitalCore(
  canvas: HTMLCanvasElement,
  options: CoreOptions = {},
): CoreHandle {
  const maybeCtx = canvas.getContext("2d", { alpha: true });

  if (!maybeCtx) {
    // No 2D context available. The CSS shell, halo and nucleus layers still
    // render a credible object on their own, so we degrade silently.
    return {
      setPointer: () => {},
      clearPointer: () => {},
      setRunning: () => {},
      destroy: () => {},
    };
  }

  // Re-bound after the guard so the hoisted draw functions below see a
  // non-nullable type without needing an assertion at every call site.
  const ctx: CanvasRenderingContext2D = maybeCtx;

  const detail = options.detail ?? 2;
  const mesh = getMesh(detail);
  const vertexCount = mesh.vertices.length;
  const edgeCount = mesh.edges.length;

  /* ── Scratch buffers ──────────────────────────────────────────────────────
   * Flat typed arrays rather than arrays of objects: one allocation up front,
   * zero per frame, and contiguous memory for the depth sort.
   */
  /** Rotated view-space coordinates, xyz interleaved. */
  const view = new Float32Array(vertexCount * 3);
  /** Screen-space x, y and depth, interleaved. */
  const screen = new Float32Array(vertexCount * 3);
  /** 0 (far) → 1 (near). */
  const proximity = new Float32Array(vertexCount);
  /** Edge draw order, depth-sorted each frame. */
  const edgeOrder = new Uint16Array(edgeCount);
  /** Midpoint depth per edge, the sort key. */
  const edgeDepth = new Float32Array(edgeCount);
  /** Face draw order and centroid depth. */
  const faceOrder = new Uint16Array(mesh.faces.length);
  const faceDepth = new Float32Array(mesh.faces.length);

  for (let i = 0; i < edgeCount; i += 1) edgeOrder[i] = i;
  for (let i = 0; i < mesh.faces.length; i += 1) faceOrder[i] = i;

  /* ── State ───────────────────────────────────────────────────────────────── */

  let targetRx = 0;
  let targetRy = 0;
  let currentRx = -0.1;
  let currentRy = -0.16;
  let ambient = 0;

  let width = 0;
  let height = 0;
  let frame = 0;
  let running = false;
  let lastTime = 0;

  /* ── Sizing ──────────────────────────────────────────────────────────────
   * The backing store is the CSS box × DPR; the context is then scaled so all
   * drawing code below works in plain CSS pixels.
   */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr);
    width = rect.width;
    height = rect.height;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const observer =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          resize();
          if (!running) draw();
        })
      : null;

  observer?.observe(canvas);

  /* ── Transform & project ─────────────────────────────────────────────────
   * Rotation about X then Y, written straight into the scratch buffers. The
   * trigonometry is hoisted out of the loop; nothing is allocated.
   */
  function project() {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * CONFIG.radius;

    const cosX = Math.cos(currentRx);
    const sinX = Math.sin(currentRx);
    const cosY = Math.cos(currentRy);
    const sinY = Math.sin(currentRy);

    for (let i = 0; i < vertexCount; i += 1) {
      const source = mesh.vertices[i] as Vec3;

      // Rotate about X.
      const y1 = source.y * cosX - source.z * sinX;
      const z1 = source.y * sinX + source.z * cosX;
      // Rotate about Y.
      const x2 = source.x * cosY + z1 * sinY;
      const z2 = -source.x * sinY + z1 * cosY;

      const v = i * 3;
      view[v] = x2;
      view[v + 1] = y1;
      view[v + 2] = z2;

      // Perspective divide. `cameraZ - z` is always > 0 for a unit sphere.
      const scale = CONFIG.focal / (CONFIG.cameraZ - z2);

      screen[v] = cx + x2 * radius * scale;
      screen[v + 1] = cy + y1 * radius * scale;
      screen[v + 2] = z2;

      proximity[i] = (z2 + 1) / 2;
    }
  }

  /* ── Drawing ─────────────────────────────────────────────────────────────── */

  function draw() {
    if (width === 0 || height === 0) resize();
    if (width === 0 || height === 0) return;

    project();
    ctx.clearRect(0, 0, width, height);

    drawFaces();
    drawEdges();
    drawVertices();
  }

  /**
   * The translucent inner solid.
   *
   * Only *back*-facing triangles are filled — we are deliberately looking
   * through the near wall of the sphere at its far wall. That single decision is
   * what makes the object read as glass rather than as a wireframe ball.
   */
  function drawFaces() {
    const faces = mesh.faces;

    // Depth-sort back-to-front by centroid.
    for (let i = 0; i < faces.length; i += 1) {
      const face = faces[i];
      if (!face) continue;
      faceDepth[i] =
        (view[face[0] * 3 + 2]! + view[face[1] * 3 + 2]! + view[face[2] * 3 + 2]!) /
        3;
    }
    sortByKey(faceOrder, faceDepth, faces.length);

    for (let k = 0; k < faces.length; k += 1) {
      const face = faces[faceOrder[k]!];
      if (!face) continue;

      const ia = face[0] * 3;
      const ib = face[1] * 3;
      const ic = face[2] * 3;

      // Face normal via cross product of two edges — computed in locals, so no
      // temporary vectors are allocated.
      const ux = view[ib]! - view[ia]!;
      const uy = view[ib + 1]! - view[ia + 1]!;
      const uz = view[ib + 2]! - view[ia + 2]!;
      const vx = view[ic]! - view[ia]!;
      const vy = view[ic + 1]! - view[ia + 1]!;
      const vz = view[ic + 2]! - view[ia + 2]!;

      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const length = Math.hypot(nx, ny, nz) || 1;
      nx /= length;
      ny /= length;
      nz /= length;

      // Keep only faces whose outward normal points away from the camera.
      if (nz > -0.02) continue;

      const lambert = Math.max(0, nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z);
      const alpha = 0.018 + lambert * 0.05;

      ctx.beginPath();
      ctx.moveTo(screen[ia]!, screen[ia + 1]!);
      ctx.lineTo(screen[ib]!, screen[ib + 1]!);
      ctx.lineTo(screen[ic]!, screen[ic + 1]!);
      ctx.closePath();
      ctx.fillStyle = `rgba(${ACCENT.r},${ACCENT.g},${ACCENT.b},${alpha.toFixed(4)})`;
      ctx.fill();
    }
  }

  /**
   * The lattice. Sorted back-to-front so near struts overdraw far ones, with
   * alpha, line width and hue all driven by depth.
   */
  function drawEdges() {
    const edges = mesh.edges;

    for (let i = 0; i < edgeCount; i += 1) {
      const edge = edges[i];
      if (!edge) continue;
      edgeDepth[i] = (view[edge[0] * 3 + 2]! + view[edge[1] * 3 + 2]!) / 2;
    }
    sortByKey(edgeOrder, edgeDepth, edgeCount);

    ctx.lineCap = "round";

    for (let k = 0; k < edgeCount; k += 1) {
      const index = edgeOrder[k]!;
      const edge = edges[index];
      if (!edge) continue;

      const p = edge[0] * 3;
      const q = edge[1] * 3;
      const near = (proximity[edge[0]]! + proximity[edge[1]]!) / 2;

      // Quadratic fog: the far hemisphere stays present but quiet.
      const fog = near * near;
      const alpha = 0.05 + fog * 0.4;

      // Nearer struts pick up a little warmth from the bounce light, so the
      // lattice isn't a uniform cool monotone.
      const warmth = Math.max(0, near - 0.62) * 1.4;
      const r = (ACCENT.r + (WARM.r - ACCENT.r) * warmth) | 0;
      const g = (ACCENT.g + (WARM.g - ACCENT.g) * warmth) | 0;
      const b = (ACCENT.b + (WARM.b - ACCENT.b) * warmth) | 0;

      ctx.beginPath();
      ctx.moveTo(screen[p]!, screen[p + 1]!);
      ctx.lineTo(screen[q]!, screen[q + 1]!);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(4)})`;
      ctx.lineWidth = 0.45 + fog * 0.75;
      ctx.stroke();
    }
  }

  /**
   * Vertex nodes on the near hemisphere only. Dotting all 162 vertices would
   * turn a considered object into visual noise.
   */
  function drawVertices() {
    for (let i = 0; i < vertexCount; i += 1) {
      const near = proximity[i]!;
      if (near < 0.58) continue;

      const t = (near - 0.58) / 0.42;
      const v = i * 3;

      ctx.beginPath();
      ctx.arc(screen[v]!, screen[v + 1]!, 0.5 + t * 1.15, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(236,244,248,${(t * 0.55).toFixed(4)})`;
      ctx.fill();
    }
  }

  /* ── Loop ────────────────────────────────────────────────────────────────── */

  function tick(now: number) {
    frame = requestAnimationFrame(tick);

    // Clamp delta so a backgrounded tab can't produce a visible jump on return.
    const delta = lastTime === 0 ? 16.7 : Math.min(now - lastTime, 50);
    lastTime = now;

    ambient += (delta / 1000) * CONFIG.ambientSpeed;

    // Idle attitude: a slow figure-of-eight. Never frozen, never spinning.
    const idleRy = Math.sin(ambient) * 0.3;
    const idleRx = Math.sin(ambient * 0.62) * 0.11;

    // Exponential approach toward pointer target plus idle drift.
    currentRx += (targetRx + idleRx - currentRx) * CONFIG.damping;
    currentRy += (targetRy + idleRy - currentRy) * CONFIG.damping;

    draw();
  }

  function setRunning(next: boolean) {
    if (next === running) return;
    running = next;

    if (running) {
      lastTime = 0;
      frame = requestAnimationFrame(tick);
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  /* ── Init ────────────────────────────────────────────────────────────────── */

  resize();

  if (options.staticFrame) {
    // Reduced motion: a single composed frame at a deliberately chosen angle.
    draw();
  } else {
    setRunning(true);
  }

  return {
    setPointer(x, y) {
      targetRy = x * CONFIG.pointerRange;
      targetRx = -y * CONFIG.pointerRange;
    },
    clearPointer() {
      targetRx = 0;
      targetRy = 0;
    },
    setRunning,
    destroy() {
      setRunning(false);
      observer?.disconnect();
    },
  };
}

/**
 * Insertion sort of `order` by ascending `key[order[i]]`.
 *
 * Insertion sort beats `Array.prototype.sort` here for two reasons: it needs no
 * comparator closure (so no allocation per frame), and the ordering is nearly
 * sorted between consecutive frames — the object rotates slowly — which is
 * insertion sort's best case, roughly O(n).
 */
function sortByKey(
  order: Uint16Array,
  key: Float32Array,
  length: number,
): void {
  for (let i = 1; i < length; i += 1) {
    const value = order[i]!;
    const depth = key[value]!;
    let j = i - 1;
    while (j >= 0 && key[order[j]!]! > depth) {
      order[j + 1] = order[j]!;
      j -= 1;
    }
    order[j + 1] = value;
  }
}
