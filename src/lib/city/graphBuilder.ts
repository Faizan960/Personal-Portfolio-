/**
 * Tech City Relationship & Graph Builder
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts validated portfolio records (`PortfolioDraft`) into an interconnected
 * 3D city of HQ, Districts, Skills, Projects and Technologies.
 *
 * Consumes:
 *   • Explicit `project.skillIds` from PostgreSQL (`project_skills`)
 *   • Explicit `project.tech` from PostgreSQL (`project_technologies`)
 *   • Explicit `cityConfig.layouts` (visibility, color, style preset, locked coords)
 *   • Explicit `cityConfig.customEdges` from `globe_custom_edges`
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PortfolioDraft, MutableProject, CityEntityKind } from "@/lib/cms/types";
import { hasProjectDetail } from "@/data/portfolio";
import { resolveProjectDetailHref } from "@/lib/project";
import {
  DISTRICT_ACCENTS,
  ENTITY_TYPE_COLORS,
  type CityEdge,
  type CityEdgeType,
  type CityGraph,
  type CityNode,
  type CityPositionOverride,
} from "./types";
import { computeDeterministicCityLayout } from "./layoutEngine";

export function slugifyCityId(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\+\+/g, "cpp")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function parseHexColor(hex: string | null | undefined, fallbackNum: number, fallbackHex: string): { hex: string; num: number } {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex.trim())) {
    return { hex: fallbackHex, num: fallbackNum };
  }
  const clean = hex.trim();
  return { hex: clean, num: parseInt(clean.slice(1), 16) };
}

function dbEntityToCityNodeId(type: CityEntityKind, id: string): string {
  if (type === "core") return "hq:owner";
  if (type === "category") return `district:${id}`;
  if (type === "skill") return `skill:${id}`;
  if (type === "project") return `project:${id}`;
  return `tech:${id}`;
}

const VERIFIED_PROJECT_SKILL_LINKS: Record<string, readonly string[]> = {
  gramcare: [
    "skill:ai:artificial-intelligence",
    "skill:ai:ai-powered-software-systems",
  ],
  "deepfake-detection": [
    "skill:programming:python",
    "skill:ai:artificial-intelligence",
  ],
  "collab-notes": [
    "skill:web:javascript",
    "skill:programming:javascript",
  ],
};

function resolveMatchingDistrictIds(
  project: MutableProject,
  draft: PortfolioDraft
): string[] {
  const catLower = project.category.toLowerCase();
  const matches: string[] = [];

  for (const cat of draft.skills) {
    if (cat.isVisible === false) continue;
    const idLower = cat.id.toLowerCase();
    const labelLower = cat.label.toLowerCase();
    if (
      catLower.includes(idLower) ||
      catLower.includes(labelLower) ||
      (idLower === "ai" && (catLower.includes("ai") || catLower.includes("machine learning"))) ||
      (idLower === "web" && catLower.includes("web")) ||
      (idLower === "cloud" && (catLower.includes("cloud") || catLower.includes("devops"))) ||
      (idLower === "tools" && (catLower.includes("tool") || catLower.includes("design")))
    ) {
      matches.push(`district:${cat.id}`);
    }
  }

  return matches;
}

const STYLE_VARIANT_MAP: Record<string, number> = {
  box: 0,
  hex: 1,
  prism: 2,
  spire: 3,
};

export function buildTechCityGraph(
  draft: PortfolioDraft,
  externalOverrides?: Record<string, CityPositionOverride>,
  options?: { includeUnpublished?: boolean }
): CityGraph {
  const nodes: CityNode[] = [];
  const edges: CityEdge[] = [];
  const nodeMap = new Map<string, CityNode>();
  const adjacency = new Map<string, Set<string>>();
  const edgesByNode = new Map<string, CityEdge[]>();

  const cityConfig = draft.cityConfig;
  const layoutList = cityConfig?.layouts || [];
  const layoutMap = new Map(
    layoutList.map((l) => [`${l.entityType}:${l.entityId}`, l])
  );

  // Merge saved database/CMS position overrides with optional runtime overrides
  const overrides: Record<string, CityPositionOverride> = { ...externalOverrides };
  for (const l of layoutList) {
    if (l.positionX !== null && l.positionZ !== null) {
      const nodeId = dbEntityToCityNodeId(l.entityType, l.entityId);
      if (!overrides[nodeId]) {
        overrides[nodeId] = {
          x: l.positionX,
          y: l.positionY ?? undefined,
          z: l.positionZ,
        };
      }
    }
  }

  function addNode(node: CityNode) {
    if (nodeMap.has(node.id)) return;
    nodes.push(node);
    nodeMap.set(node.id, node);
    adjacency.set(node.id, new Set());
    edgesByNode.set(node.id, []);
  }

  function addEdge(
    sourceId: string,
    targetId: string,
    type: CityEdgeType,
    color: number
  ) {
    if (!nodeMap.has(sourceId) || !nodeMap.has(targetId) || sourceId === targetId) {
      return;
    }
    const key =
      sourceId < targetId ? `${sourceId}<->${targetId}` : `${targetId}<->${sourceId}`;
    const edgeId = `edge:${key}:${type}`;
    if (edges.some((e) => e.id === edgeId)) return;

    const edge: CityEdge = { id: edgeId, sourceId, targetId, type, color };
    edges.push(edge);
    adjacency.get(sourceId)?.add(targetId);
    adjacency.get(targetId)?.add(sourceId);
    edgesByNode.get(sourceId)?.push(edge);
    edgesByNode.get(targetId)?.push(edge);
  }

  // 1. Central Headquarters
  const hqId = "hq:owner";
  const hqLayout = layoutMap.get("core:portfolio");
  const hqColor = parseHexColor(
    hqLayout?.colorOverride,
    ENTITY_TYPE_COLORS.hq.num,
    ENTITY_TYPE_COLORS.hq.hex
  );
  addNode({
    id: hqId,
    type: "hq",
    label: cityConfig?.appearance.coreLabel || draft.personal.name,
    subtitle: cityConfig?.appearance.coreSubtitle || draft.personal.role,
    description: `${draft.personal.statement} ${draft.personal.descriptor}`.trim(),
    accentHex: hqColor.hex,
    accentColor: hqColor.num,
    position: { x: 0, y: 0, z: 0 },
    metadata: {
      role: draft.personal.role,
      descriptor: draft.personal.descriptor,
      location: draft.personal.location,
      detailHref: "#about",
    },
  });

  // 2. Skill Categories (Districts) & Skills (Buildings)
  const skillsByLowerName = new Map<string, CityNode[]>();
  const defaultStyle = cityConfig?.appearance.buildingStyleDefault || "mixed";

  draft.skills.forEach((cat, idx) => {
    const catLayout = layoutMap.get(`category:${cat.id}`);
    if (cat.isVisible === false || catLayout?.isVisible === false) return;

    const districtId = `district:${cat.id}`;
    const baseAccent = DISTRICT_ACCENTS[cat.id] || ENTITY_TYPE_COLORS.district;
    const accent = parseHexColor(catLayout?.colorOverride, baseAccent.num, baseAccent.hex);

    addNode({
      id: districtId,
      type: "district",
      label: cat.label,
      subtitle: `${cat.items.length} skill${cat.items.length === 1 ? "" : "s"}`,
      description: cat.caption || `${cat.label} domain district.`,
      accentHex: accent.hex,
      accentColor: accent.num,
      position: { x: 0, y: 0, z: 0 },
      metadata: {
        entityId: cat.id,
        categoryId: cat.id,
        categoryLabel: cat.label,
        caption: cat.caption,
        index: cat.index,
        skillCount: cat.items.length,
        detailHref: "#skills",
      },
    });

    addEdge(hqId, districtId, "hq-district", accent.num);

    cat.items.forEach((skillName, skillIdx) => {
      const slug = slugifyCityId(skillName);
      const dbSkillKey = `${cat.id}:${slug}`;
      const skillLayout = layoutMap.get(`skill:${dbSkillKey}`);
      if (skillLayout?.isVisible === false) return;

      const skillId = `skill:${dbSkillKey}`;
      const skillColor = parseHexColor(
        skillLayout?.colorOverride,
        accent.num,
        ENTITY_TYPE_COLORS.skill.hex
      );
      const presetVariant =
        skillLayout?.stylePreset && skillLayout.stylePreset in STYLE_VARIANT_MAP
          ? STYLE_VARIANT_MAP[skillLayout.stylePreset]!
          : defaultStyle !== "mixed" && defaultStyle in STYLE_VARIANT_MAP
            ? STYLE_VARIANT_MAP[defaultStyle]!
            : (Math.floor(hashString(skillId) * 4) + idx + skillIdx) % 4;

      const skillNode: CityNode = {
        id: skillId,
        type: "skill",
        label: skillName,
        subtitle: cat.label,
        description: `Skill within ${cat.label}.`,
        accentHex: skillColor.hex,
        accentColor: skillColor.num,
        districtId,
        shapeVariant: presetVariant,
        position: { x: 0, y: 0, z: 0 },
        metadata: {
          entityId: dbSkillKey,
          categoryId: cat.id,
          categoryLabel: cat.label,
          projectCount: 0,
        },
      };

      addNode(skillNode);
      addEdge(districtId, skillId, "district-skill", accent.num);

      const lower = skillName.toLowerCase();
      const existing = skillsByLowerName.get(lower) || [];
      existing.push(skillNode);
      skillsByLowerName.set(lower, existing);
    });
  });

  // 3. Technologies Dictionary lookup for visibility & color overrides
  const techCatalogMap = new Map(
    (draft.technologies || []).map((t) => [t.name.toLowerCase(), t])
  );

  // 4. Projects (Floating Landmarks) & Technologies (Orbiting Satellites)
  draft.projects.forEach((proj) => {
    if (!options?.includeUnpublished && proj.isPublished === false) return;
    const projLayout = layoutMap.get(`project:${proj.id}`);
    if (projLayout?.isVisible === false) return;

    const projId = `project:${proj.id}`;
    const canViewDetail = hasProjectDetail(proj as Parameters<typeof hasProjectDetail>[0]);
    const projColor = parseHexColor(
      projLayout?.colorOverride,
      ENTITY_TYPE_COLORS.project.num,
      ENTITY_TYPE_COLORS.project.hex
    );

    addNode({
      id: projId,
      type: "project",
      label: proj.name,
      subtitle: proj.fullTitle || proj.category,
      description: proj.summary,
      accentHex: projColor.hex,
      accentColor: projColor.num,
      shapeVariant:
        projLayout?.stylePreset && projLayout.stylePreset in STYLE_VARIANT_MAP
          ? STYLE_VARIANT_MAP[projLayout.stylePreset]
          : 0,
      position: { x: 0, y: 6.5, z: 0 },
      metadata: {
        entityId: proj.id,
        categoryLabel: proj.category,
        status: proj.status,
        visibility: proj.visibility,
        githubUrl: proj.github,
        liveUrl: proj.liveUrl,
        detailHref: canViewDetail
          ? resolveProjectDetailHref(proj, proj.summary)
          : `/work/view/?id=${encodeURIComponent(proj.id)}`,
        tech: [...proj.tech],
        index: proj.index,
      },
    });

    let hasAnyConnection = false;

    const matchingDistricts = resolveMatchingDistrictIds(proj, draft);
    for (const dId of matchingDistricts) {
      const dNode = nodeMap.get(dId);
      addEdge(dId, projId, "district-project", dNode?.accentColor ?? projColor.num);
      hasAnyConnection = true;
    }

    // Explicit `project_skills` links from CMS/DB first, falling back to baseline verified links
    const explicitSkillIds =
      proj.skillIds && proj.skillIds.length > 0
        ? proj.skillIds.map((sid) => (sid.startsWith("skill:") ? sid : `skill:${sid}`))
        : VERIFIED_PROJECT_SKILL_LINKS[proj.id] || [];

    for (const skillId of explicitSkillIds) {
      if (nodeMap.has(skillId)) {
        addEdge(skillId, projId, "skill-project", projColor.num);
        hasAnyConnection = true;
      }
    }

    // Direct technology-to-skill name matches
    for (const techName of proj.tech) {
      const matchedSkills = skillsByLowerName.get(techName.toLowerCase()) || [];
      for (const sNode of matchedSkills) {
        addEdge(sNode.id, projId, "skill-project", projColor.num);
        hasAnyConnection = true;
      }
    }

    // Technology Satellites from project.tech
    proj.tech.forEach((techName) => {
      const catalogEntry = techCatalogMap.get(techName.toLowerCase());
      const techSlug = catalogEntry?.id || slugifyCityId(techName);
      const techLayout = layoutMap.get(`technology:${techSlug}`);
      if (catalogEntry?.isVisible === false || techLayout?.isVisible === false) {
        return;
      }

      const techId = `tech:${techSlug}`;
      const techColor = parseHexColor(
        techLayout?.colorOverride || catalogEntry?.colorOverride,
        ENTITY_TYPE_COLORS.technology.num,
        ENTITY_TYPE_COLORS.technology.hex
      );

      if (!nodeMap.has(techId)) {
        addNode({
          id: techId,
          type: "technology",
          label: techName,
          subtitle: "Project Technology",
          description: catalogEntry?.description || `Technology utilized in ${proj.name}.`,
          accentHex: techColor.hex,
          accentColor: techColor.num,
          primaryProjectId: projId,
          position: { x: 0, y: 6.5, z: 0 },
          metadata: {
            entityId: techSlug,
            tech: [techName],
          },
        });
      }

      addEdge(projId, techId, "project-tech", techColor.num);

      const matchedSkills = skillsByLowerName.get(techName.toLowerCase()) || [];
      for (const sNode of matchedSkills) {
        addEdge(techId, sNode.id, "tech-skill", techColor.num);
      }
    });

    if (!hasAnyConnection) {
      addEdge(hqId, projId, "hq-project", projColor.num);
    }
  });

  // 5. Apply explicit Tech City custom connections from CMS (`globe_custom_edges`)
  for (const ce of cityConfig?.customEdges || []) {
    if (!ce.isVisible) continue;
    const sId = dbEntityToCityNodeId(ce.sourceType, ce.sourceId);
    const tId = dbEntityToCityNodeId(ce.targetType, ce.targetId);
    const sNode = nodeMap.get(sId);
    const edgeType: CityEdgeType =
      ce.sourceType === "skill" && ce.targetType === "project"
        ? "skill-project"
        : ce.sourceType === "project" && ce.targetType === "technology"
          ? "project-tech"
          : ce.sourceType === "category" && ce.targetType === "project"
            ? "district-project"
            : "tech-skill";
    addEdge(sId, tId, edgeType, sNode?.accentColor ?? ENTITY_TYPE_COLORS.district.num);
  }

  // 6. Compute tower heights (manual `radius` override or verified project relationship count)
  for (const node of nodes) {
    if (node.type === "skill") {
      const nodeEdges = edgesByNode.get(node.id) || [];
      const projectNeighbors = new Set<string>();
      for (const edge of nodeEdges) {
        if (edge.type === "skill-project") {
          const otherId = edge.sourceId === node.id ? edge.targetId : edge.sourceId;
          projectNeighbors.add(otherId);
        }
      }
      const pCount = projectNeighbors.size;
      node.metadata.projectCount = pCount;
      const skillLayout = node.metadata.entityId
        ? layoutMap.get(`skill:${node.metadata.entityId}`)
        : undefined;
      if (skillLayout?.radius && skillLayout.radius > 0.5) {
        node.height = Number(skillLayout.radius.toFixed(2));
      } else {
        const architecturalVariance = 0.25 + hashString(node.id) * 0.55;
        node.height = Number((1.45 + architecturalVariance + pCount * 1.15).toFixed(2));
      }
    }
  }

  const graph: CityGraph = {
    nodes,
    edges,
    nodeMap,
    adjacency,
    edgesByNode,
    generatedAt: Date.now(),
  };

  computeDeterministicCityLayout(graph, overrides);

  return graph;
}
