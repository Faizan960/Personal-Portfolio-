import * as THREE from "three";
import type { CityGraph, CityNode } from "./types";

export const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 3.0, 0);

export interface CameraState {
  theta: number;
  phi: number;
  dist: number;
  targetTheta: number;
  targetPhi: number;
  targetDist: number;
  look: THREE.Vector3;
  targetLook: THREE.Vector3;
}

const MIN_PHI = 0.32;
const MAX_PHI = 1.44;
const MIN_DIST = 11;
const MAX_DIST = 48;
const OVERVIEW_DIST = 31;
const OVERVIEW_PHI = 0.96;

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function createCameraState(
  reducedMotion: boolean,
  initialDistance = OVERVIEW_DIST,
  initialPitch = OVERVIEW_PHI
): CameraState {
  return {
    theta: reducedMotion ? 0.58 : 0.25,
    phi: reducedMotion ? initialPitch : Math.max(MIN_PHI, initialPitch - 0.1),
    dist: reducedMotion ? initialDistance : initialDistance + 7,
    targetTheta: 0.58,
    targetPhi: clamp(initialPitch, MIN_PHI, MAX_PHI),
    targetDist: clamp(initialDistance, MIN_DIST, MAX_DIST),
    look: DEFAULT_CAMERA_TARGET.clone(),
    targetLook: DEFAULT_CAMERA_TARGET.clone(),
  };
}

export function orbitCamera(state: CameraState, dx: number, dy: number): void {
  state.targetTheta -= dx * 0.006;
  state.targetPhi = clamp(state.targetPhi - dy * 0.005, MIN_PHI, MAX_PHI);
}

export function zoomCamera(state: CameraState, factor: number): void {
  state.targetDist = clamp(state.targetDist * factor, MIN_DIST, MAX_DIST);
}

export function resetCameraToOverview(state: CameraState): void {
  state.targetLook.copy(DEFAULT_CAMERA_TARGET);
  state.targetDist = OVERVIEW_DIST;
  state.targetPhi = OVERVIEW_PHI;
}

/**
 * Smoothly frames the selected node and its connected neighbors while preserving
 * surrounding city context (never snaps abruptly, never relocates buildings).
 */
export function focusCameraOnChain(
  state: CameraState,
  selected: CityNode,
  chainNodes: CityNode[],
  graph: CityGraph
): void {
  const focusSet = chainNodes.length > 0 ? chainNodes : [selected];
  const center = new THREE.Vector3();

  // Weight selected node higher so elevated projects/satellites remain centered
  let totalWeight = 0;
  for (const n of focusSet) {
    const isElevated = selected.type === "project" || selected.type === "technology";
    const w = n.id === selected.id ? (isElevated ? 3.4 : 2.2) : 1.0;
    const focusY =
      n.type === "skill"
        ? (n.height ?? 2.0) * 0.55
        : n.type === "hq"
          ? 4.8
          : n.type === "district"
            ? 0.9
            : n.position.y;
    center.x += n.position.x * w;
    center.y += focusY * w;
    center.z += n.position.z * w;
    totalWeight += w;
  }
  if (totalWeight > 0) {
    center.divideScalar(totalWeight);
  }

  let maxExtent = 0;
  for (const n of focusSet) {
    const pos = new THREE.Vector3(
      n.position.x,
      n.type === "skill" ? (n.height ?? 2.0) * 0.55 : n.position.y,
      n.position.z
    );
    maxExtent = Math.max(maxExtent, pos.distanceTo(center));
  }

  state.targetLook.copy(center);

  // Frame distance based on entity type & neighborhood spread
  const basePad =
    selected.type === "hq"
      ? 16
      : selected.type === "project" || selected.type === "technology"
        ? 14
        : selected.type === "district"
          ? 12
          : 11;
  state.targetDist = clamp(maxExtent * 1.9 + basePad, 16.5, 36);

  // Rotate horizontally cleanly via shortest angular path toward the focal center
  if (Math.hypot(center.x, center.z) > 0.5) {
    const desiredAngle = Math.atan2(center.x, center.z);
    const delta = Math.atan2(
      Math.sin(desiredAngle - state.theta),
      Math.cos(desiredAngle - state.theta)
    );
    state.targetTheta = state.theta + delta;
  }

  // Keep pitch slightly elevated so floating landmarks and ground towers share frame cleanly
  state.targetPhi = selected.type === "project" || selected.type === "technology" ? 0.94 : 0.96;

  // Avoid unused parameter warning if graph needed for future multi-hop framing
  void graph;
}

export function stepCamera(
  state: CameraState,
  camera: THREE.PerspectiveCamera,
  dt: number,
  aspect: number,
  shouldAutoOrbit: boolean,
  orbitSpeed = 0.055
): void {
  if (shouldAutoOrbit) {
    state.targetTheta += dt * orbitSpeed;
  }

  // Frame-rate independent exponential smoothing
  const k = 1 - Math.exp(-4.8 * dt);
  state.theta += (state.targetTheta - state.theta) * k;
  state.phi += (state.targetPhi - state.phi) * k;
  state.dist += (state.targetDist - state.dist) * k;
  state.look.lerp(state.targetLook, k);

  // Pull camera slightly farther back on narrow portrait viewports
  const responsiveDist = state.dist * (aspect < 0.9 ? 1.48 : aspect < 1.2 ? 1.18 : 1.0);

  camera.position.set(
    state.look.x + responsiveDist * Math.sin(state.phi) * Math.sin(state.theta),
    state.look.y + responsiveDist * Math.cos(state.phi),
    state.look.z + responsiveDist * Math.sin(state.phi) * Math.cos(state.theta)
  );
  camera.lookAt(state.look);
}
