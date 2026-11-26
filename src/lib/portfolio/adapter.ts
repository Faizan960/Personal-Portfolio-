import type {
  PortfolioDraft,
  MutableProject,
  MutableSkillCategory,
  MutableTechnology,
  MutableExperienceItem,
  MutableEducationItem,
  MutableCertification,
  MutableAchievement,
  MutableExploringItem,
  MutablePersonal,
  MutableMeta,
  MutableHero,
  MutableAbout,
  MutableContact,
  MutableSocialLink,
  MutableRecognition,
  MutableNavSection,
  SectionsConfig,
  TechCityConfig,
  TechCityNodeLayout,
  TechCityCustomEdge,
  MutableMediaAsset,
  PublicationMeta,
  CityEntityKind,
  CityRelationshipKind,
} from "@/lib/cms/types";
import {
  getDefaultSectionsConfig,
  getDefaultTechCityAppearance,
  sanitizeDraft,
} from "@/lib/cms/storage";
import type { Database } from "@/lib/supabase/database.types";

type DbSettings = Database["public"]["Tables"]["portfolio_settings"]["Row"];
type DbCategory = Database["public"]["Tables"]["skill_categories"]["Row"];
type DbSkill = Database["public"]["Tables"]["skills"]["Row"];
type DbProject = Database["public"]["Tables"]["projects"]["Row"];
type DbProjectSkill = Database["public"]["Tables"]["project_skills"]["Row"];
type DbExperience = Database["public"]["Tables"]["experience"]["Row"];
type DbHighlight = Database["public"]["Tables"]["experience_highlights"]["Row"];
type DbExpTech = Database["public"]["Tables"]["experience_technologies"]["Row"];
type DbTech = Database["public"]["Tables"]["technologies"]["Row"];
type DbEducation = Database["public"]["Tables"]["education"]["Row"];
type DbEduDetail = Database["public"]["Tables"]["education_details"]["Row"];
type DbCertification = Database["public"]["Tables"]["certifications"]["Row"];
type DbAchievement = Database["public"]["Tables"]["achievements"]["Row"];
type DbExploring = Database["public"]["Tables"]["exploring_items"]["Row"];
type DbGlobeSettings = Database["public"]["Tables"]["globe_settings"]["Row"];
type DbGlobeNodeLayout = Database["public"]["Tables"]["globe_node_layouts"]["Row"];
type DbGlobeCustomEdge = Database["public"]["Tables"]["globe_custom_edges"]["Row"];
type DbMediaAsset = Database["public"]["Tables"]["media_assets"]["Row"];

export interface RawRemoteData {
  settings: DbSettings | null;
  categories: DbCategory[];
  skills: DbSkill[];
  projects: DbProject[];
  projectTechnologies: { project_id: string; technology_id: string; sort_order?: number; technologies: DbTech | null }[];
  projectSkills?: DbProjectSkill[];
  technologies?: DbTech[];
  experience: DbExperience[];
  experienceHighlights: DbHighlight[];
  experienceTechnologies: (DbExpTech & { technologies: DbTech | null })[];
  education: DbEducation[];
  educationDetails: DbEduDetail[];
  certifications: DbCertification[];
  achievements: DbAchievement[];
  exploring: DbExploring[];
  globeSettings?: DbGlobeSettings | null;
  globeNodeLayouts?: DbGlobeNodeLayout[];
  globeCustomEdges?: DbGlobeCustomEdge[];
  mediaAssets?: DbMediaAsset[];
  publicationMeta?: PublicationMeta;
}

/**
 * Maps raw relational database rows into a unified PortfolioDraft object.
 */
export function mapDatabaseToDraft(raw: RawRemoteData): PortfolioDraft {
  const settings = raw.settings;

  const personal = (settings?.personal as unknown as MutablePersonal) || {
    name: "Faizan Patel",
    wordmark: "FAIZAN",
    initials: "FP",
    role: "Computer Engineering Student",
    descriptor: "Exploring AI, Web Development, Cloud Computing & DevOps.",
    statement: "Building with code, AI and curiosity.",
    location: "Mumbai, India",
    resumeHref: null,
  };

  const statementAlternatives =
    (settings?.statement_alternatives as unknown as string[]) || [];
  const meta = (settings?.meta as unknown as MutableMeta) || {
    title: "Faizan Patel — Computer Engineering Student",
    description: "",
    siteUrl: null,
  };
  const hero = (settings?.hero as unknown as MutableHero) || {
    kicker: "Portfolio",
    primaryCta: { label: "Explore My Work", targetId: "work" },
    secondaryCta: { label: "Let's Connect", targetId: "contact" },
  };
  const about = (settings?.about as unknown as MutableAbout) || {
    kicker: "About",
    heading: "About Me",
    paragraphs: [],
    metadata: [],
  };
  const contact = (settings?.contact as unknown as MutableContact) || {
    kicker: "Contact",
    heading: "Let's Build Something",
    statement: "",
    links: [],
  };
  const social = (settings?.social as unknown as MutableSocialLink[]) || [];
  const recognition = (settings?.recognition as unknown as MutableRecognition) || {
    kicker: "Recognition",
    heading: "Recognition",
    achievementsLabel: "Achievement",
    certificationsLabel: "Certifications",
  };
  const navSections = (settings?.nav_sections as unknown as MutableNavSection[]) || [];
  const sectionsConfig =
    (settings?.sections_config as unknown as SectionsConfig | undefined) ||
    getDefaultSectionsConfig();

  // Group skills by category
  const skillCategories: MutableSkillCategory[] = raw.categories
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((cat) => {
      const records = raw.skills
        .filter((s) => s.category_id === cat.id)
        .sort((a, b) => a.sort_order - b.sort_order);

      return {
        id: cat.id,
        label: cat.label,
        index: cat.display_index || "",
        caption: cat.caption || "",
        isVisible: cat.is_visible,
        items: records.filter((r) => r.is_visible).map((s) => s.name),
        skillRecords: records.map((s) => ({
          id: s.id,
          name: s.name,
          sortOrder: s.sort_order,
          isVisible: s.is_visible,
        })),
      };
    });

  // Map projects with technologies and explicit skill links
  const projects: MutableProject[] = raw.projects
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => {
      const projTech = raw.projectTechnologies
        .filter((pt) => pt.project_id === p.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((pt) => pt.technologies?.name || pt.technology_id);

      const projSkills = (raw.projectSkills || [])
        .filter((ps) => ps.project_id === p.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((ps) => ps.skill_id);

      return {
        id: p.id,
        index: p.index || "",
        name: p.name,
        fullTitle: p.full_title,
        category: p.category,
        summary: p.summary,
        tech: projTech,
        skillIds: projSkills,
        featured: p.featured,
        status: p.status as MutableProject["status"],
        visibility: p.visibility as MutableProject["visibility"],
        isPublished: p.is_published ?? true,
        github: p.github,
        liveUrl: p.live_url,
        image: p.image,
        detail: p.detail as unknown as MutableProject["detail"],
      };
    });

  // Map technologies dictionary
  const technologies: MutableTechnology[] = (raw.technologies || [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({
      id: t.id,
      name: t.name,
      normalizedName: t.normalized_name,
      colorOverride: t.color_override ?? null,
      isVisible: t.is_visible ?? true,
      description: t.description ?? null,
    }));

  // Map experience
  const experience: MutableExperienceItem[] = raw.experience
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((exp) => {
      const highlights = raw.experienceHighlights
        .filter((h) => h.experience_id === exp.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((h) => h.content);

      const tech = raw.experienceTechnologies
        .filter((et) => et.experience_id === exp.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((et) => et.technologies?.name || et.technology_id);

      return {
        id: exp.id,
        role: exp.role,
        organisation: exp.organisation,
        period: exp.period,
        location: exp.location,
        duration: exp.duration,
        current: exp.current,
        summary: exp.summary,
        highlights,
        tech,
        isVisible: exp.is_visible,
      };
    });

  // Map education
  const education: MutableEducationItem[] = raw.education
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((edu) => {
      const details = raw.educationDetails
        .filter((d) => d.education_id === edu.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((d) => d.content);

      return {
        id: edu.id,
        qualification: edu.qualification,
        award: edu.award,
        institution: edu.institution,
        period: edu.period,
        location: edu.location,
        current: edu.current,
        details,
        isVisible: edu.is_visible,
      };
    });

  const certifications: MutableCertification[] = raw.certifications
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      issued: c.issued,
      credentialId: c.credential_id,
      credentialUrl: c.credential_url,
      isVisible: c.is_visible,
    }));

  const achievements: MutableAchievement[] = raw.achievements
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((a) => ({
      id: a.id,
      name: a.name,
      result: a.result,
      context: a.context,
      date: a.date,
      isVisible: a.is_visible,
    }));

  const exploring: MutableExploringItem[] = raw.exploring
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((e) => ({
      id: e.id,
      index: e.index || "",
      label: e.label,
      caption: e.caption,
      isVisible: e.is_visible,
    }));

  // Map Tech City config from globe_settings, globe_node_layouts, globe_custom_edges
  const gs = raw.globeSettings;
  const defaultAppearance = getDefaultTechCityAppearance();
  const vc = (gs?.visual_config as Record<string, unknown> | undefined) || {};
  const lc = (gs?.layout_config as Record<string, unknown> | undefined) || {};

  const layouts: TechCityNodeLayout[] = (raw.globeNodeLayouts || []).map((l) => ({
    entityType: l.entity_type as CityEntityKind,
    entityId: l.entity_id,
    positionX: l.position_x,
    positionY: l.position_y,
    positionZ: l.position_z,
    radius: l.radius,
    colorOverride: l.color_override,
    stylePreset: l.style_preset ?? null,
    isLocked: l.is_locked ?? false,
    sortOrder: l.sort_order,
    isVisible: l.is_visible,
  }));

  const customEdges: TechCityCustomEdge[] = (raw.globeCustomEdges || []).map((e) => ({
    id: e.id,
    sourceType: e.source_type as CityEntityKind,
    sourceId: e.source_id,
    targetType: e.target_type as CityEntityKind,
    targetId: e.target_id,
    relationshipType: e.relationship_type as CityRelationshipKind,
    strength: Number(e.strength ?? 1),
    isVisible: e.is_visible,
  }));

  const cityConfig: TechCityConfig = {
    appearance: {
      ...defaultAppearance,
      coreLabel: gs?.core_label || personal.name,
      coreSubtitle: gs?.core_subtitle || personal.role,
      palettePreset:
        (vc.palettePreset as TechCityConfig["appearance"]["palettePreset"]) ||
        defaultAppearance.palettePreset,
      bloomEnabled:
        typeof vc.bloomEnabled === "boolean"
          ? vc.bloomEnabled
          : typeof vc.bloom === "boolean"
            ? vc.bloom
            : defaultAppearance.bloomEnabled,
      fogDensity:
        typeof vc.fogDensity === "number" ? vc.fogDensity : defaultAppearance.fogDensity,
      particleDensity:
        typeof vc.particleDensity === "number"
          ? vc.particleDensity
          : defaultAppearance.particleDensity,
      roadOpacity:
        typeof vc.roadOpacity === "number" ? vc.roadOpacity : defaultAppearance.roadOpacity,
      autoOrbitSpeed:
        typeof vc.autoOrbitSpeed === "number"
          ? vc.autoOrbitSpeed
          : typeof vc.ambientSpeed === "number"
            ? vc.ambientSpeed
            : defaultAppearance.autoOrbitSpeed,
      buildingStyleDefault:
        (vc.buildingStyleDefault as TechCityConfig["appearance"]["buildingStyleDefault"]) ||
        defaultAppearance.buildingStyleDefault,
      cameraDistance:
        typeof lc.cameraDistance === "number"
          ? lc.cameraDistance
          : defaultAppearance.cameraDistance,
      cameraPitch:
        typeof lc.cameraPitch === "number" ? lc.cameraPitch : defaultAppearance.cameraPitch,
      cityScale:
        typeof lc.cityScale === "number" ? lc.cityScale : defaultAppearance.cityScale,
    },
    layouts,
    customEdges,
  };

  const media: MutableMediaAsset[] = (raw.mediaAssets || []).map((m) => ({
    id: m.id,
    filename: m.filename,
    originalFilename: m.original_filename,
    bucketId: m.bucket_id as "portfolio-public" | "portfolio-private",
    storagePath: m.storage_path,
    mimeType: m.mime_type,
    sizeBytes: m.size_bytes,
    altText: m.alt_text,
    mediaType: m.media_type,
    entityType: m.entity_type,
    entityId: m.entity_id,
    isPublished: m.is_published,
    createdAt: m.created_at,
  }));

  return sanitizeDraft({
    version: 3,
    lastModified: settings?.updated_at || new Date().toISOString(),
    personal,
    statementAlternatives,
    meta,
    hero,
    about,
    skills: skillCategories,
    projects,
    technologies: technologies.length > 0 ? technologies : undefined,
    experience,
    education,
    exploring,
    achievements,
    certifications,
    recognition,
    contact,
    social,
    navSections,
    sectionsConfig,
    cityConfig,
    media,
    publicationMeta: raw.publicationMeta,
  });
}
