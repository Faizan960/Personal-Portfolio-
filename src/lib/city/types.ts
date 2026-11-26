import type { ProjectStatus, ProjectVisibility } from "@/data/portfolio";

export type CityEntityType =
  | "hq"
  | "district"
  | "skill"
  | "project"
  | "technology";

export type CityEdgeType =
  | "hq-district"
  | "district-skill"
  | "district-project"
  | "skill-project"
  | "project-tech"
  | "tech-skill"
  | "hq-project";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CityPositionOverride {
  x: number;
  y?: number;
  z: number;
}

export interface CityNodeMetadata {
  entityId?: string;
  categoryId?: string;
  categoryLabel?: string;
  caption?: string;
  role?: string;
  descriptor?: string;
  location?: string | null;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  githubUrl?: string | null;
  liveUrl?: string | null;
  detailHref?: string | null;
  tech?: readonly string[];
  projectCount?: number;
  skillCount?: number;
  index?: string;
}

export interface CityNode {
  id: string;
  type: CityEntityType;
  label: string;
  subtitle?: string;
  description: string;
  accentHex: string;
  accentColor: number;
  position: Vec3;
  /** Outward radial unit vector from HQ (used for district titles & avenues). */
  outDir?: { x: number; z: number };
  /** Deterministic platform radius for districts (prevents overlap). */
  platformRadius?: number;
  /** Deterministic building height for skill towers. */
  height?: number;
  /** Architectural style index (0-3) for visual variety. */
  shapeVariant?: number;
  districtId?: string;
  /** Primary parent project ID for orbiting technology satellites. */
  primaryProjectId?: string;
  /** Orbit parameters for technology satellites around projects. */
  orbitAngle?: number;
  orbitRadius?: number;
  orbitYOffset?: number;
  metadata: CityNodeMetadata;
}

export interface CityEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: CityEdgeType;
  color: number;
}

export interface CityGraph {
  nodes: CityNode[];
  edges: CityEdge[];
  nodeMap: Map<string, CityNode>;
  adjacency: Map<string, Set<string>>;
  edgesByNode: Map<string, CityEdge[]>;
  generatedAt: number;
}

export const ENTITY_TYPE_LABELS: Record<CityEntityType, string> = {
  hq: "Headquarters",
  district: "Domain District",
  skill: "Skill Tower",
  project: "Project Landmark",
  technology: "Technology Satellite",
};

export const ENTITY_TYPE_COLORS: Record<CityEntityType, { hex: string; num: number }> = {
  hq: { hex: "#bfe6ff", num: 0xbfe6ff },
  district: { hex: "#a78bfa", num: 0xa78bfa },
  skill: { hex: "#22d3ee", num: 0x22d3ee },
  project: { hex: "#fcd34d", num: 0xfcd34d },
  technology: { hex: "#818cf8", num: 0x818cf8 },
};

export const DISTRICT_ACCENTS: Record<string, { hex: string; num: number }> = {
  programming: { hex: "#a78bfa", num: 0xa78bfa },
  web: { hex: "#38bdf8", num: 0x38bdf8 },
  ai: { hex: "#2dd4bf", num: 0x2dd4bf },
  cloud: { hex: "#818cf8", num: 0x818cf8 },
  tools: { hex: "#c084fc", num: 0xc084fc },
};
