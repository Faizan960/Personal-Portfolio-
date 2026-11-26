/**
 * Deterministic City Layout Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Computes stable, collision-free 3D positions for:
 *   • Central HQ at (0, 0, 0)
 *   • Districts in a balanced ring around HQ with dynamic radius scaling
 *   • Skill towers arranged inside each district with guaranteed clearance
 *   • Floating project landmarks near verified connections + collision repulsion
 *   • Orbiting technology satellites anchored around their primary project
 *   • Optional manual overrides (`overrides`) supported for future CMS controls
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { CityGraph, CityNode, CityPositionOverride } from "./types";

const HQ_CLEARANCE_RADIUS = 4.6;
const MIN_SKILL_SPACING = 1.9;
const MIN_PROJECT_SPACING = 4.4;

export function computeDeterministicCityLayout(
  graph: CityGraph,
  overrides?: Record<string, CityPositionOverride>
): void {
  const districts = graph.nodes.filter((n) => n.type === "district");
  const skills = graph.nodes.filter((n) => n.type === "skill");
  const projects = graph.nodes.filter((n) => n.type === "project");
  const techs = graph.nodes.filter((n) => n.type === "technology");

  // 1. Central HQ
  const hq = graph.nodes.find((n) => n.type === "hq");
  if (hq) {
    const ov = overrides?.[hq.id];
    hq.position = { x: ov?.x ?? 0, y: ov?.y ?? 0, z: ov?.z ?? 0 };
  }

  // 2. Districts arranged evenly around HQ
  const districtCount = Math.max(1, districts.length);
  // Scale ring radius if there are many districts so platforms stay well-separated
  const districtRingRadius = Math.max(11.2, districtCount * 2.25);

  districts.forEach((d, idx) => {
    const angle = (idx * Math.PI * 2) / districtCount + 0.32;
    const outX = Math.sin(angle);
    const outZ = Math.cos(angle);
    d.outDir = { x: outX, z: outZ };

    const districtSkills = skills.filter((s) => s.districtId === d.id);
    const k = districtSkills.length;

    // Guarantee non-overlapping skill tower ring inside district
    const skillOrbitR =
      k <= 1 ? 0 : Math.max(1.55, (k * MIN_SKILL_SPACING) / (Math.PI * 2));
    d.platformRadius = Math.max(2.7, skillOrbitR + 1.35);

    const ov = overrides?.[d.id];
    d.position = {
      x: ov?.x ?? outX * districtRingRadius,
      y: ov?.y ?? 0,
      z: ov?.z ?? outZ * districtRingRadius,
    };

    // Place each skill building inside the district
    districtSkills.forEach((s, j) => {
      const sOv = overrides?.[s.id];
      if (sOv) {
        s.position = { x: sOv.x, y: sOv.y ?? 0, z: sOv.z };
        return;
      }

      if (k === 1) {
        s.position = { x: d.position.x, y: 0, z: d.position.z };
      } else {
        const sAngle = (j * Math.PI * 2) / k + angle * 0.5 + 0.4;
        s.position = {
          x: d.position.x + Math.sin(sAngle) * skillOrbitR,
          y: 0,
          z: d.position.z + Math.cos(sAngle) * skillOrbitR,
        };
      }
    });
  });

  // 3. Floating Project Landmarks
  // Position each project near the centroid of its verified skill/district connections,
  // or in an open quadrant if anchored only to HQ (e.g., Niyyah.app).
  let hqAnchoredCount = 0;

  projects.forEach((p, idx) => {
    const ov = overrides?.[p.id];
    const baseElevation = 6.2 + (idx % 2) * 1.4;

    if (ov) {
      p.position = { x: ov.x, y: ov.y ?? baseElevation, z: ov.z };
      return;
    }

    const neighborIds = Array.from(graph.adjacency.get(p.id) || []);
    const anchorNodes: CityNode[] = [];

    for (const nid of neighborIds) {
      const nb = graph.nodeMap.get(nid);
      if (nb && (nb.type === "skill" || nb.type === "district")) {
        anchorNodes.push(nb);
      }
    }

    if (anchorNodes.length > 0) {
      let sx = 0;
      let sz = 0;
      for (const a of anchorNodes) {
        sx += a.position.x;
        sz += a.position.z;
      }
      const cx = sx / anchorNodes.length;
      const cz = sz / anchorNodes.length;
      // Pull slightly inward toward the inner skyline so beams sweep cleanly
      p.position = {
        x: cx * 0.88,
        y: baseElevation,
        z: cz * 0.88,
      };
    } else {
      // Anchor at a clear radial corridor between districts (no overlap with HQ)
      const angle = (hqAnchoredCount * Math.PI * 2) / Math.max(2, districtCount) - 0.35;
      hqAnchoredCount += 1;
      const r = 7.4;
      p.position = {
        x: Math.sin(angle) * r,
        y: baseElevation,
        z: Math.cos(angle) * r,
      };
    }
  });

  // Iterative collision resolution for floating project landmarks & HQ clearance
  for (let iter = 0; iter < 60; iter++) {
    for (let i = 0; i < projects.length; i++) {
      const a = projects[i]!;
      if (overrides?.[a.id]) continue;

      // Maintain minimum radial clearance from central HQ spire
      const hqDist = Math.hypot(a.position.x, a.position.z);
      if (hqDist < HQ_CLEARANCE_RADIUS) {
        const pushAngle = hqDist > 0.001 ? Math.atan2(a.position.x, a.position.z) : i * 1.7;
        a.position.x = Math.sin(pushAngle) * HQ_CLEARANCE_RADIUS;
        a.position.z = Math.cos(pushAngle) * HQ_CLEARANCE_RADIUS;
      }

      // Repel overlapping project landmarks
      for (let j = i + 1; j < projects.length; j++) {
        const b = projects[j]!;
        const dx = a.position.x - b.position.x;
        const dz = a.position.z - b.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < MIN_PROJECT_SPACING) {
          const safeDist = dist > 0.001 ? dist : 0.001;
          const push = ((MIN_PROJECT_SPACING - safeDist) * 0.28) / safeDist;
          const px = (dist > 0.001 ? dx : Math.cos(i + j)) * push;
          const pz = (dist > 0.001 ? dz : Math.sin(i + j)) * push;
          a.position.x += px;
          a.position.z += pz;
          if (!overrides?.[b.id]) {
            b.position.x -= px;
            b.position.z -= pz;
          }
        }
      }
    }
  }

  // 4. Technology Satellites orbiting their connected projects
  const techOrbitCounts = new Map<string, number>();

  techs.forEach((t) => {
    const ov = overrides?.[t.id];
    const projId = t.primaryProjectId;
    const parentProj = projId ? graph.nodeMap.get(projId) : undefined;

    if (parentProj) {
      const currentIdx = techOrbitCounts.get(parentProj.id) || 0;
      techOrbitCounts.set(parentProj.id, currentIdx + 1);

      // Count total techs anchored to this parent for even angular spacing
      const siblings = techs.filter((x) => x.primaryProjectId === parentProj.id).length;
      const angle = (currentIdx * Math.PI * 2) / Math.max(1, siblings) + 0.85;
      const orbitR = 1.95;
      const yOff = 0.55 + (currentIdx % 2) * 0.35;

      t.orbitAngle = angle;
      t.orbitRadius = orbitR;
      t.orbitYOffset = yOff;

      t.position = {
        x: ov?.x ?? parentProj.position.x + Math.cos(angle) * orbitR,
        y: ov?.y ?? parentProj.position.y + yOff,
        z: ov?.z ?? parentProj.position.z + Math.sin(angle) * orbitR,
      };
    } else {
      t.position = { x: ov?.x ?? 4, y: ov?.y ?? 5, z: ov?.z ?? 4 };
    }
  });
}
