/**
 * Mutable data interfaces for the CMS draft layer and unified portfolio model.
 * Mirrors src/data/portfolio.ts while extending cleanly for Supabase, Publishing,
 * Homepage Section Management, Media Library, and Tech City visual configuration.
 */

export interface MutableSocialLink {
  id: "email" | "linkedin" | "github";
  label: string;
  handle: string | null;
  href: string | null;
}

export interface MutableSkillRecord {
  id: string;
  name: string;
  sortOrder: number;
  isVisible: boolean;
}

export interface MutableSkillCategory {
  id: string;
  label: string;
  index: string;
  caption: string;
  items: string[];
  isVisible?: boolean;
  skillRecords?: MutableSkillRecord[];
}

export type MutableProjectStatus = "concept" | "in-development" | "planned" | null;

export type MutableProjectVisibility =
  | "public"
  | "private"
  | "development"
  | "unknown";

export interface MutableProjectScreenshot {
  src: string;
  alt: string;
}

export interface MutableReservedSection {
  label: string;
  body: string | null;
}

export interface MutableProjectDetail {
  problem: string | null;
  solution: string | null;
  features: string[];
  architecture: string[];
  contribution: string | null;
  challenges: string[];
  lessons: string[];
  futureScope: string[];
  screenshots: MutableProjectScreenshot[];
  reservedSections: MutableReservedSection[];
}

export interface MutableProject {
  id: string;
  index: string;
  name: string;
  fullTitle: string | null;
  category: string;
  summary: string;
  tech: string[];
  /** Explicit verified skill IDs (e.g. 'programming:python') from project_skills */
  skillIds?: string[];
  featured: boolean;
  status: MutableProjectStatus;
  /** Repository visibility ('public' | 'private' | 'development' | 'unknown') */
  visibility: MutableProjectVisibility;
  /** Controls whether this project appears on the live public portfolio */
  isPublished?: boolean;
  github: string | null;
  liveUrl: string | null;
  image: string | null;
  detail: MutableProjectDetail;
}

export interface MutableTechnology {
  id: string;
  name: string;
  normalizedName: string;
  colorOverride: string | null;
  isVisible: boolean;
  description: string | null;
}

export interface MutableExperienceItem {
  id: string;
  role: string;
  organisation: string;
  period: string;
  location: string;
  duration: string | null;
  current: boolean;
  summary: string;
  highlights: string[];
  tech: string[];
  isVisible?: boolean;
}

export interface MutableEducationItem {
  id: string;
  qualification: string;
  award: string;
  institution: string | null;
  period: string | null;
  location: string | null;
  current: boolean;
  details: string[];
  isVisible?: boolean;
}

export interface MutableCertification {
  id: string;
  name: string;
  issuer: string | null;
  issued: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  isVisible?: boolean;
}

export interface MutableAchievement {
  id: string;
  name: string;
  result: string | null;
  context: string | null;
  date: string | null;
  isVisible?: boolean;
}

export interface MutableExploringItem {
  id: string;
  index: string;
  label: string;
  caption: string;
  isVisible?: boolean;
}

export interface MutableNavSection {
  id: string;
  label: string;
  index: string;
}

export interface MutablePersonal {
  name: string;
  wordmark: string;
  initials: string;
  role: string;
  descriptor: string;
  statement: string;
  location: string | null;
  resumeHref: string | null;
}

export interface MutableMeta {
  title: string;
  description: string;
  siteUrl: string | null;
}

export interface MutableHero {
  kicker: string;
  primaryCta: { label: string; targetId: string };
  secondaryCta: { label: string; targetId: string };
}

export interface MutableAboutMetadata {
  label: string;
  value: string;
}

export interface MutableAbout {
  kicker: string;
  heading: string;
  paragraphs: string[];
  metadata: MutableAboutMetadata[];
}

export interface MutableContact {
  kicker: string;
  heading: string;
  statement: string;
  links: MutableSocialLink[];
}

export interface MutableRecognition {
  kicker: string;
  heading: string;
  achievementsLabel: string;
  certificationsLabel: string;
}

export type HomepageSectionId =
  | "hero"
  | "tech-city"
  | "about"
  | "skills"
  | "work"
  | "experience"
  | "education"
  | "exploring"
  | "recognition"
  | "contact";

export interface HomepageSectionSetting {
  id: HomepageSectionId;
  label: string;
  visible: boolean;
  locked?: boolean;
  headingOverride: string | null;
  introOverride: string | null;
}

export interface SectionsConfig {
  order: HomepageSectionId[];
  sections: Record<HomepageSectionId, HomepageSectionSetting>;
}

export type CityEntityKind =
  | "core"
  | "category"
  | "skill"
  | "project"
  | "technology";

export type CityRelationshipKind =
  | "uses"
  | "demonstrates"
  | "built-with"
  | "relevant-to"
  | "integrates"
  | "supports"
  | "extends";

export type CityPalettePreset =
  | "cyber-navy"
  | "aurora-teal"
  | "solar-gold"
  | "monochrome-ice";

export interface TechCityAppearance {
  palettePreset: CityPalettePreset;
  bloomEnabled: boolean;
  fogDensity: number;
  particleDensity: number;
  roadOpacity: number;
  autoOrbitSpeed: number;
  cameraDistance: number;
  cameraPitch: number;
  cityScale: number;
  buildingStyleDefault: "mixed" | "box" | "hex" | "prism";
  coreLabel: string;
  coreSubtitle: string;
}

export interface TechCityNodeLayout {
  entityType: CityEntityKind;
  entityId: string;
  positionX: number | null;
  positionY: number | null;
  positionZ: number | null;
  radius: number | null;
  colorOverride: string | null;
  stylePreset: string | null;
  isLocked: boolean;
  sortOrder: number | null;
  isVisible: boolean;
}

export interface TechCityCustomEdge {
  id: string;
  sourceType: CityEntityKind;
  sourceId: string;
  targetType: CityEntityKind;
  targetId: string;
  relationshipType: CityRelationshipKind;
  strength: number;
  isVisible: boolean;
}

export interface TechCityConfig {
  appearance: TechCityAppearance;
  layouts: TechCityNodeLayout[];
  customEdges: TechCityCustomEdge[];
}

export interface MutableMediaAsset {
  id: string;
  filename: string;
  originalFilename?: string | null;
  bucketId: "portfolio-public" | "portfolio-private";
  storagePath: string;
  mimeType: string | null;
  sizeBytes?: number | null;
  altText: string | null;
  mediaType?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  isPublished: boolean;
  createdAt?: string;
}

export interface PublicationMeta {
  version: number;
  publishedAt: string | null;
  publishedByEmail: string | null;
  notes?: string | null;
}

export interface PublicationHistoryItem {
  id: string;
  version: number;
  action: "publish" | "rollback" | "seed";
  status: "success" | "failed";
  changedSections: string[];
  summary: string | null;
  publishedAt: string;
  publishedByEmail: string | null;
  payload: PortfolioDraft;
}

/** Complete mutable portfolio data contract */
export interface PortfolioDraft {
  version: number;
  lastModified: string;
  personal: MutablePersonal;
  statementAlternatives: string[];
  meta: MutableMeta;
  hero: MutableHero;
  about: MutableAbout;
  skills: MutableSkillCategory[];
  projects: MutableProject[];
  technologies?: MutableTechnology[];
  experience: MutableExperienceItem[];
  education: MutableEducationItem[];
  exploring: MutableExploringItem[];
  achievements: MutableAchievement[];
  certifications: MutableCertification[];
  recognition: MutableRecognition;
  contact: MutableContact;
  social: MutableSocialLink[];
  navSections: MutableNavSection[];
  sectionsConfig?: SectionsConfig;
  cityConfig?: TechCityConfig;
  media?: MutableMediaAsset[];
  publicationMeta?: PublicationMeta;
}
