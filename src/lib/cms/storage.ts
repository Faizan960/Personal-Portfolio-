/**
 * Storage adapter for the CMS development draft layer.
 * Uses browser localStorage with versioning, defensive parsing, and baseline reset.
 */

import { portfolioData } from "@/data/portfolio";
import type {
  HomepageSectionId,
  MutableTechnology,
  PortfolioDraft,
  SectionsConfig,
  TechCityAppearance,
  TechCityConfig,
} from "./types";

export const CMS_STORAGE_KEY = "portfolio_cms_draft_v2";
export const CMS_DRAFT_VERSION = 2;

export const DEFAULT_SECTION_ORDER: HomepageSectionId[] = [
  "hero",
  "tech-city",
  "about",
  "skills",
  "work",
  "experience",
  "education",
  "exploring",
  "recognition",
  "contact",
];

export function getDefaultSectionsConfig(): SectionsConfig {
  return {
    order: [...DEFAULT_SECTION_ORDER],
    sections: {
      hero: {
        id: "hero",
        label: "Hero Introduction",
        visible: true,
        locked: true,
        headingOverride: null,
        introOverride: null,
      },
      "tech-city": {
        id: "tech-city",
        label: "Tech City 3D",
        visible: true,
        headingOverride: "Tech City",
        introOverride:
          "Domains form districts, skills rise as towers, projects float above, and verified technologies orbit them.",
      },
      about: {
        id: "about",
        label: "About",
        visible: true,
        headingOverride: null,
        introOverride: null,
      },
      skills: {
        id: "skills",
        label: "Skills",
        visible: true,
        headingOverride: null,
        introOverride: null,
      },
      work: {
        id: "work",
        label: "Selected Work",
        visible: true,
        headingOverride: null,
        introOverride: null,
      },
      experience: {
        id: "experience",
        label: "Experience",
        visible: true,
        headingOverride: null,
        introOverride: null,
      },
      education: {
        id: "education",
        label: "Education",
        visible: true,
        headingOverride: null,
        introOverride: null,
      },
      exploring: {
        id: "exploring",
        label: "Currently Exploring",
        visible: true,
        headingOverride: null,
        introOverride: null,
      },
      recognition: {
        id: "recognition",
        label: "Recognition",
        visible: true,
        headingOverride: null,
        introOverride: null,
      },
      contact: {
        id: "contact",
        label: "Contact",
        visible: true,
        locked: true,
        headingOverride: null,
        introOverride: null,
      },
    },
  };
}

export function getDefaultTechCityAppearance(): TechCityAppearance {
  return {
    palettePreset: "cyber-navy",
    bloomEnabled: true,
    fogDensity: 0.0125,
    particleDensity: 1.0,
    roadOpacity: 0.52,
    autoOrbitSpeed: 0.055,
    cameraDistance: 31,
    cameraPitch: 0.96,
    cityScale: 1.0,
    buildingStyleDefault: "mixed",
    coreLabel: portfolioData.personal.name,
    coreSubtitle: portfolioData.personal.role,
  };
}

export function getDefaultTechCityConfig(): TechCityConfig {
  return {
    appearance: getDefaultTechCityAppearance(),
    layouts: [],
    customEdges: [],
  };
}

const BASELINE_PROJECT_SKILLS: Record<string, string[]> = {
  gramcare: ["ai:artificial-intelligence", "ai:ai-powered-software-systems"],
  "deepfake-detection": ["programming:python", "ai:artificial-intelligence"],
  "collab-notes": ["programming:javascript", "web:javascript"],
};

function deriveBaselineTechnologies(): MutableTechnology[] {
  const seen = new Map<string, MutableTechnology>();
  const addTech = (name: string) => {
    const id = name
      .toLowerCase()
      .trim()
      .replace(/\+\+/g, "cpp")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!id || seen.has(id)) return;
    seen.set(id, {
      id,
      name,
      normalizedName: id,
      colorOverride: null,
      isVisible: true,
      description: null,
    });
  };
  portfolioData.projects.forEach((p) => p.tech.forEach(addTech));
  portfolioData.experience.forEach((e) => e.tech.forEach(addTech));
  return Array.from(seen.values());
}

/**
 * Creates a clean deep clone of the reference portfolio data from portfolio.ts.
 * Does not mutate the original data.
 */
export function getBaselinePortfolio(): PortfolioDraft {
  return {
    version: CMS_DRAFT_VERSION,
    lastModified: new Date().toISOString(),
    personal: { ...portfolioData.personal },
    statementAlternatives: [...portfolioData.statementAlternatives],
    meta: { ...portfolioData.meta },
    hero: {
      kicker: portfolioData.hero.kicker,
      primaryCta: { ...portfolioData.hero.primaryCta },
      secondaryCta: { ...portfolioData.hero.secondaryCta },
    },
    about: {
      kicker: portfolioData.about.kicker,
      heading: portfolioData.about.heading,
      paragraphs: [...portfolioData.about.paragraphs],
      metadata: portfolioData.about.metadata.map((m) => ({ ...m })),
    },
    skills: portfolioData.skills.map((s) => ({
      id: s.id,
      label: s.label,
      index: s.index,
      caption: s.caption,
      items: [...s.items],
      isVisible: true,
    })),
    projects: portfolioData.projects.map((p) => ({
      id: p.id,
      index: p.index,
      name: p.name,
      fullTitle: p.fullTitle,
      category: p.category,
      summary: p.summary,
      tech: [...p.tech],
      skillIds: BASELINE_PROJECT_SKILLS[p.id] ? [...BASELINE_PROJECT_SKILLS[p.id]!] : [],
      featured: p.featured,
      status: p.status,
      visibility: p.visibility,
      isPublished: true,
      github: p.github,
      liveUrl: p.liveUrl,
      image: p.image,
      detail: {
        problem: p.detail.problem,
        solution: p.detail.solution,
        features: [...p.detail.features],
        architecture: [...p.detail.architecture],
        contribution: p.detail.contribution,
        challenges: [...p.detail.challenges],
        lessons: [...p.detail.lessons],
        futureScope: [...p.detail.futureScope],
        screenshots: p.detail.screenshots.map((s) => ({ ...s })),
        reservedSections: p.detail.reservedSections.map((r) => ({ ...r })),
      },
    })),
    technologies: deriveBaselineTechnologies(),
    experience: portfolioData.experience.map((e) => ({
      id: e.id,
      role: e.role,
      organisation: e.organisation,
      period: e.period,
      location: e.location,
      duration: e.duration,
      current: e.current,
      summary: e.summary,
      highlights: [...e.highlights],
      tech: [...e.tech],
      isVisible: true,
    })),
    education: portfolioData.education.map((ed) => ({
      id: ed.id,
      qualification: ed.qualification,
      award: ed.award,
      institution: ed.institution,
      period: ed.period,
      location: ed.location,
      current: ed.current,
      details: [...ed.details],
      isVisible: true,
    })),
    exploring: portfolioData.exploring.map((ex) => ({ ...ex, isVisible: true })),
    achievements: portfolioData.achievements.map((a) => ({ ...a, isVisible: true })),
    certifications: portfolioData.certifications.map((c) => ({ ...c, isVisible: true })),
    recognition: {
      kicker: portfolioData.recognition.kicker,
      heading: portfolioData.recognition.heading,
      achievementsLabel: portfolioData.recognition.achievementsLabel,
      certificationsLabel: portfolioData.recognition.certificationsLabel,
    },
    contact: {
      kicker: portfolioData.contact.kicker,
      heading: portfolioData.contact.heading,
      statement: portfolioData.contact.statement,
      links: portfolioData.contact.links.map((l) => ({ ...l })),
    },
    social: portfolioData.social.map((s) => ({ ...s })),
    navSections: portfolioData.navSections.map((n) => ({ ...n })),
    sectionsConfig: getDefaultSectionsConfig(),
    cityConfig: getDefaultTechCityConfig(),
    media: [],
  };
}

/** Validate whether a parsed object conforms to the PortfolioDraft shape */
export function validatePortfolioDraft(obj: unknown): obj is PortfolioDraft {
  if (!obj || typeof obj !== "object") return false;
  const draft = obj as Partial<PortfolioDraft>;

  const hasPersonal =
    !!draft.personal &&
    typeof draft.personal.name === "string" &&
    typeof draft.personal.role === "string";
  const hasMeta = !!draft.meta && typeof draft.meta.title === "string";
  const hasHero = !!draft.hero && typeof draft.hero.kicker === "string";
  const hasAbout =
    !!draft.about &&
    typeof draft.about.heading === "string" &&
    Array.isArray(draft.about.paragraphs);
  const hasContact = !!draft.contact && Array.isArray(draft.contact.links);
  const hasProjects =
    Array.isArray(draft.projects) &&
    draft.projects.every(
      (p) =>
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        p.detail &&
        typeof p.detail === "object"
    );
  const hasSkills =
    Array.isArray(draft.skills) &&
    draft.skills.every((s) => typeof s.id === "string" && Array.isArray(s.items));
  const hasExperience = Array.isArray(draft.experience);
  const hasEducation = Array.isArray(draft.education);
  const hasCertifications = Array.isArray(draft.certifications);
  const hasAchievements = Array.isArray(draft.achievements);

  return (
    hasPersonal &&
    hasMeta &&
    hasHero &&
    hasAbout &&
    hasContact &&
    hasProjects &&
    hasSkills &&
    hasExperience &&
    hasEducation &&
    hasCertifications &&
    hasAchievements
  );
}

/**
 * Defensively sanitizes a draft by merging with baseline defaults.
 * Guarantees every nested object and array exists and null values are preserved.
 */
export function sanitizeDraft(draft: PortfolioDraft): PortfolioDraft {
  const baseline = getBaselinePortfolio();
  const defaultSections = getDefaultSectionsConfig();
  const defaultCity = getDefaultTechCityConfig();

  const mergedOrder = Array.isArray(draft.sectionsConfig?.order)
    ? Array.from(
      new Set([
        ...draft.sectionsConfig.order.filter((id) =>
          DEFAULT_SECTION_ORDER.includes(id)
        ),
        ...DEFAULT_SECTION_ORDER,
      ])
    )
    : defaultSections.order;

  const mergedSections = { ...defaultSections.sections };
  for (const id of DEFAULT_SECTION_ORDER) {
    const incoming = draft.sectionsConfig?.sections?.[id];
    if (incoming) {
      mergedSections[id] = {
        ...defaultSections.sections[id],
        ...incoming,
        id,
      };
    }
  }

  return {
    ...baseline,
    ...draft,
    version: CMS_DRAFT_VERSION,
    personal: { ...baseline.personal, ...draft.personal },
    meta: { ...baseline.meta, ...draft.meta },
    hero: { ...baseline.hero, ...draft.hero },
    about: {
      ...baseline.about,
      ...draft.about,
      paragraphs: Array.isArray(draft.about?.paragraphs)
        ? [...draft.about.paragraphs]
        : baseline.about.paragraphs,
      metadata: Array.isArray(draft.about?.metadata)
        ? draft.about.metadata.map((m) => ({ ...m }))
        : baseline.about.metadata,
    },
    contact: {
      ...baseline.contact,
      ...draft.contact,
      links: Array.isArray(draft.contact?.links)
        ? draft.contact.links.map((l) => ({ ...l }))
        : baseline.contact.links,
    },
    skills: Array.isArray(draft.skills)
      ? draft.skills.map((s) => ({
        ...s,
        items: Array.isArray(s.items) ? [...s.items] : [],
        isVisible: s.isVisible ?? true,
      }))
      : baseline.skills,
    projects: Array.isArray(draft.projects)
      ? draft.projects.map((p) => ({
        ...p,
        tech: Array.isArray(p.tech) ? [...p.tech] : [],
        skillIds: Array.isArray(p.skillIds)
          ? [...p.skillIds]
          : BASELINE_PROJECT_SKILLS[p.id]
            ? [...BASELINE_PROJECT_SKILLS[p.id]!]
            : [],
        isPublished: p.isPublished ?? true,
        detail: {
          problem: p.detail?.problem ?? null,
          solution: p.detail?.solution ?? null,
          contribution: p.detail?.contribution ?? null,
          features: Array.isArray(p.detail?.features) ? [...p.detail.features] : [],
          architecture: Array.isArray(p.detail?.architecture)
            ? [...p.detail.architecture]
            : [],
          challenges: Array.isArray(p.detail?.challenges) ? [...p.detail.challenges] : [],
          lessons: Array.isArray(p.detail?.lessons) ? [...p.detail.lessons] : [],
          futureScope: Array.isArray(p.detail?.futureScope)
            ? [...p.detail.futureScope]
            : [],
          screenshots: Array.isArray(p.detail?.screenshots)
            ? p.detail.screenshots.map((s) => ({ ...s }))
            : [],
          reservedSections: Array.isArray(p.detail?.reservedSections)
            ? p.detail.reservedSections.map((r) => ({ ...r }))
            : [],
        },
      }))
      : baseline.projects,
    technologies: Array.isArray(draft.technologies)
      ? draft.technologies.map((t) => ({ ...t }))
      : baseline.technologies,
    experience: Array.isArray(draft.experience)
      ? draft.experience.map((e) => ({
        ...e,
        highlights: Array.isArray(e.highlights) ? [...e.highlights] : [],
        tech: Array.isArray(e.tech) ? [...e.tech] : [],
        isVisible: e.isVisible ?? true,
      }))
      : baseline.experience,
    education: Array.isArray(draft.education)
      ? draft.education.map((ed) => ({
        ...ed,
        details: Array.isArray(ed.details) ? [...ed.details] : [],
        isVisible: ed.isVisible ?? true,
      }))
      : baseline.education,
    exploring: Array.isArray(draft.exploring)
      ? draft.exploring.map((ex) => ({ ...ex, isVisible: ex.isVisible ?? true }))
      : baseline.exploring,
    achievements: Array.isArray(draft.achievements)
      ? draft.achievements.map((a) => ({ ...a, isVisible: a.isVisible ?? true }))
      : baseline.achievements,
    certifications: Array.isArray(draft.certifications)
      ? draft.certifications.map((c) => ({ ...c, isVisible: c.isVisible ?? true }))
      : baseline.certifications,
    social: Array.isArray(draft.social)
      ? draft.social.map((s) => ({ ...s }))
      : baseline.social,
    navSections: Array.isArray(draft.navSections)
      ? draft.navSections.map((n) => ({ ...n }))
      : baseline.navSections,
    statementAlternatives: Array.isArray(draft.statementAlternatives)
      ? [...draft.statementAlternatives]
      : baseline.statementAlternatives,
    sectionsConfig: {
      order: mergedOrder,
      sections: mergedSections,
    },
    cityConfig: (() => {
      const rawCity = draft.cityConfig as unknown as Record<string, unknown> | undefined;
      const vc = (rawCity?.visualConfig as Record<string, unknown> | undefined) ?? {};
      const legacyMappedAppearance: Partial<TechCityAppearance> = {
        ...(typeof rawCity?.coreLabel === "string" ? { coreLabel: rawCity.coreLabel } : {}),
        ...(typeof rawCity?.coreSubtitle === "string"
          ? { coreSubtitle: rawCity.coreSubtitle }
          : {}),
        ...(typeof vc.palettePreset === "string"
          ? { palettePreset: vc.palettePreset as TechCityAppearance["palettePreset"] }
          : {}),
        ...(typeof vc.bloomEnabled === "boolean"
          ? { bloomEnabled: vc.bloomEnabled }
          : typeof vc.bloom === "boolean"
            ? { bloomEnabled: vc.bloom }
            : {}),
        ...(typeof vc.fogDensity === "number" ? { fogDensity: vc.fogDensity } : {}),
        ...(typeof vc.particleDensity === "number"
          ? { particleDensity: vc.particleDensity }
          : {}),
        ...(typeof vc.roadOpacity === "number" ? { roadOpacity: vc.roadOpacity } : {}),
        ...(typeof vc.autoOrbitSpeed === "number"
          ? { autoOrbitSpeed: vc.autoOrbitSpeed }
          : {}),
        ...(typeof vc.cameraDistance === "number"
          ? { cameraDistance: vc.cameraDistance }
          : {}),
        ...(typeof vc.cameraPitch === "number" ? { cameraPitch: vc.cameraPitch } : {}),
        ...(typeof vc.cityScale === "number" ? { cityScale: vc.cityScale } : {}),
        ...(typeof vc.buildingStyleDefault === "string"
          ? {
              buildingStyleDefault:
                vc.buildingStyleDefault as TechCityAppearance["buildingStyleDefault"],
            }
          : {}),
      };
      return {
        appearance: {
          ...defaultCity.appearance,
          ...legacyMappedAppearance,
          ...draft.cityConfig?.appearance,
        },
        layouts: Array.isArray(draft.cityConfig?.layouts)
          ? draft.cityConfig.layouts.map((l) => ({ ...l }))
          : [],
        customEdges: Array.isArray(draft.cityConfig?.customEdges)
          ? draft.cityConfig.customEdges.map((ce) => ({ ...ce }))
          : [],
      };
    })(),
    media: Array.isArray(draft.media) ? draft.media.map((m) => ({ ...m })) : [],
  };
}

/** Check if a custom local draft exists in localStorage without silently falling back */
export function hasSavedLocalDraft(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(CMS_STORAGE_KEY));
}

/** Load draft from localStorage. Safe to call only on client */
export function loadDraftFromStorage(): PortfolioDraft {
  if (typeof window === "undefined") {
    return getBaselinePortfolio();
  }

  try {
    const raw = window.localStorage.getItem(CMS_STORAGE_KEY);
    if (!raw) {
      return getBaselinePortfolio();
    }
    const parsed = JSON.parse(raw);
    if (validatePortfolioDraft(parsed)) {
      return sanitizeDraft(parsed);
    }
    console.warn("CMS draft validation failed. Reverting to baseline data.");
    return getBaselinePortfolio();
  } catch (err) {
    console.error("Failed to parse CMS draft from storage:", err);
    return getBaselinePortfolio();
  }
}

/** Save draft to localStorage. Safe to call only on client */
export function saveDraftToStorage(draft: PortfolioDraft): boolean {
  if (typeof window === "undefined") return false;
  try {
    const sanitized = sanitizeDraft(draft);
    const toSave: PortfolioDraft = {
      ...sanitized,
      version: CMS_DRAFT_VERSION,
      lastModified: new Date().toISOString(),
    };
    window.localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(toSave));
    window.dispatchEvent(new CustomEvent("portfolio_draft_changed", { detail: toSave }));
    return true;
  } catch (err) {
    console.error("Failed to save CMS draft to storage:", err);
    return false;
  }
}

/** Reset draft in localStorage to baseline */
export function resetDraftInStorage(): PortfolioDraft {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CMS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("portfolio_draft_changed", { detail: null }));
  }
  return getBaselinePortfolio();
}

/** Returns storage diagnostic information */
export function getStorageStats(): {
  hasCustomDraft: boolean;
  byteSize: number;
  lastModified: string | null;
  key: string;
} {
  if (typeof window === "undefined") {
    return { hasCustomDraft: false, byteSize: 0, lastModified: null, key: CMS_STORAGE_KEY };
  }
  try {
    const raw = window.localStorage.getItem(CMS_STORAGE_KEY);
    if (!raw) {
      return { hasCustomDraft: false, byteSize: 0, lastModified: null, key: CMS_STORAGE_KEY };
    }
    const parsed = JSON.parse(raw) as Partial<PortfolioDraft>;
    return {
      hasCustomDraft: true,
      byteSize: new Blob([raw]).size,
      lastModified: parsed.lastModified || null,
      key: CMS_STORAGE_KEY,
    };
  } catch {
    return { hasCustomDraft: false, byteSize: 0, lastModified: null, key: CMS_STORAGE_KEY };
  }
}
