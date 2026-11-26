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
  TechCityConfig,
  PublicationHistoryItem,
  MutableMediaAsset,
} from "@/lib/cms/types";
import type { Json } from "@/lib/supabase/database.types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { translateDatabaseError } from "@/lib/supabase/queries";
import {
  loadDraftFromStorage,
  saveDraftToStorage,
  getBaselinePortfolio,
  sanitizeDraft,
} from "@/lib/cms/storage";
import { mapDatabaseToDraft, type RawRemoteData } from "./adapter";
import { getFallbackPortfolio, savePublishedCache } from "./fallback";
import { validateDraftForPublication } from "./validation";

export type PersistenceSource = "supabase" | "cache" | "localStorage" | "baseline";

export interface RepositoryLoadResult {
  draft: PortfolioDraft;
  source: PersistenceSource;
  publishedVersion?: number;
  publishedAt?: string | null;
  fallbackActive?: boolean;
  error?: string;
}

export interface RepositoryActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  source: PersistenceSource;
}

function slugifyId(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\+\+/g, "cpp")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Universal Portfolio & Tech City Repository
 * Single data-access layer bridging Supabase PostgreSQL, published snapshots,
 * offline cache, and local development drafts.
 */
export class PortfolioRepository {
  /**
   * Load the working CMS workspace state (admin draft tables or local draft fallback).
   */
  async loadPortfolio(): Promise<RepositoryLoadResult> {
    if (!isSupabaseConfigured()) {
      const local = loadDraftFromStorage();
      return { draft: local, source: "localStorage" };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      const local = loadDraftFromStorage();
      return {
        draft: local || getBaselinePortfolio(),
        source: local ? "localStorage" : "baseline",
      };
    }

    try {
      const [
        settingsRes,
        categoriesRes,
        skillsRes,
        projectsRes,
        projTechRes,
        projSkillsRes,
        techsRes,
        expRes,
        expHighlightsRes,
        expTechRes,
        eduRes,
        eduDetailsRes,
        certsRes,
        achieveRes,
        exploringRes,
        globeSettingsRes,
        globeLayoutsRes,
        globeEdgesRes,
        mediaRes,
        snapshotRes,
      ] = await Promise.all([
        supabase.from("portfolio_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("skill_categories").select("*").order("sort_order"),
        supabase.from("skills").select("*").order("sort_order"),
        supabase.from("projects").select("*").order("sort_order"),
        supabase
          .from("project_technologies")
          .select("project_id, technology_id, sort_order, technologies(*)"),
        supabase.from("project_skills").select("*").order("sort_order"),
        supabase.from("technologies").select("*").order("name"),
        supabase.from("experience").select("*").order("sort_order"),
        supabase.from("experience_highlights").select("*").order("sort_order"),
        supabase.from("experience_technologies").select("*, technologies(*)"),
        supabase.from("education").select("*").order("sort_order"),
        supabase.from("education_details").select("*").order("sort_order"),
        supabase.from("certifications").select("*").order("sort_order"),
        supabase.from("achievements").select("*").order("sort_order"),
        supabase.from("exploring_items").select("*").order("sort_order"),
        supabase.from("globe_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("globe_node_layouts").select("*"),
        supabase.from("globe_custom_edges").select("*").order("sort_order"),
        supabase
          .from("media_assets")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("published_snapshots")
          .select("version, published_at, published_by_email, notes")
          .eq("id", 1)
          .maybeSingle(),
      ]);

      if (!settingsRes.data && (!projectsRes.data || projectsRes.data.length === 0)) {
        const local = loadDraftFromStorage();
        return {
          draft: local || getBaselinePortfolio(),
          source: local ? "localStorage" : "baseline",
        };
      }

      const rawData: RawRemoteData = {
        settings: settingsRes.data || null,
        categories: categoriesRes.data || [],
        skills: skillsRes.data || [],
        projects: projectsRes.data || [],
        projectTechnologies:
          (projTechRes.data as unknown as RawRemoteData["projectTechnologies"]) || [],
        projectSkills: projSkillsRes.data || [],
        technologies: techsRes.data || [],
        experience: expRes.data || [],
        experienceHighlights: expHighlightsRes.data || [],
        experienceTechnologies:
          (expTechRes.data as unknown as RawRemoteData["experienceTechnologies"]) || [],
        education: eduRes.data || [],
        educationDetails: eduDetailsRes.data || [],
        certifications: certsRes.data || [],
        achievements: achieveRes.data || [],
        exploring: exploringRes.data || [],
        globeSettings: globeSettingsRes.data || null,
        globeNodeLayouts: globeLayoutsRes.data || [],
        globeCustomEdges: globeEdgesRes.data || [],
        mediaAssets: mediaRes.data || [],
        publicationMeta: snapshotRes.data
          ? {
              version: snapshotRes.data.version,
              publishedAt: snapshotRes.data.published_at,
              publishedByEmail: snapshotRes.data.published_by_email,
              notes: snapshotRes.data.notes,
            }
          : undefined,
      };

      const mappedDraft = mapDatabaseToDraft(rawData);
      return {
        draft: mappedDraft,
        source: "supabase",
        publishedVersion: snapshotRes.data?.version,
        publishedAt: snapshotRes.data?.published_at ?? null,
      };
    } catch (err) {
      console.warn("Supabase fetch failed, falling back to local persistence:", err);
      const local = loadDraftFromStorage();
      return {
        draft: local || getBaselinePortfolio(),
        source: local ? "localStorage" : "baseline",
        fallbackActive: true,
        error: translateDatabaseError(err, "Loading portfolio"),
      };
    }
  }

  /**
   * Load the live published portfolio snapshot for public visitors & Tech City.
   * Priority:
   *   1. Supabase `published_snapshots` (atomic approved bundle)
   *   2. Direct public tables fallback (if migration 008 is pending)
   *   3. Last-known-good `localStorage` cache (`portfolio_published_cache_v1`)
   *   4. Verified static `portfolio.ts` baseline
   */
  async loadPublishedPortfolio(): Promise<RepositoryLoadResult> {
    if (!isSupabaseConfigured()) {
      const fb = getFallbackPortfolio();
      return {
        draft: fb.draft,
        source: fb.source,
        publishedVersion: fb.version,
        publishedAt: fb.publishedAt,
        fallbackActive: true,
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      const fb = getFallbackPortfolio();
      return {
        draft: fb.draft,
        source: fb.source,
        publishedVersion: fb.version,
        publishedAt: fb.publishedAt,
        fallbackActive: true,
      };
    }

    try {
      const { data: snap, error: snapErr } = await supabase
        .from("published_snapshots")
        .select("version, payload, published_at, published_by_email, notes")
        .eq("id", 1)
        .maybeSingle();

      if (!snapErr && snap && snap.payload) {
        const sanitized = sanitizeDraft({
          ...(snap.payload as unknown as PortfolioDraft),
          publicationMeta: {
            version: snap.version,
            publishedAt: snap.published_at,
            publishedByEmail: snap.published_by_email,
            notes: snap.notes,
          },
        });
        savePublishedCache({
          version: snap.version,
          publishedAt: snap.published_at,
          draft: sanitized,
        });
        return {
          draft: sanitized,
          source: "supabase",
          publishedVersion: snap.version,
          publishedAt: snap.published_at,
          fallbackActive: false,
        };
      }

      // If migration 008 hasn't been applied yet (or snapshot empty), fall back
      // to public normalized tables so existing 001-007 deployments still load live.
      const res = await this.loadPortfolio();
      if (res.source === "supabase") {
        savePublishedCache({
          version: res.publishedVersion ?? 1,
          publishedAt: res.publishedAt ?? null,
          draft: res.draft,
        });
        return res;
      }

      const fb = getFallbackPortfolio();
      return {
        draft: fb.draft,
        source: fb.source,
        publishedVersion: fb.version,
        publishedAt: fb.publishedAt,
        fallbackActive: true,
        error: res.error,
      };
    } catch (err) {
      const fb = getFallbackPortfolio();
      return {
        draft: fb.draft,
        source: fb.source,
        publishedVersion: fb.version,
        publishedAt: fb.publishedAt,
        fallbackActive: true,
        error: translateDatabaseError(err, "Public content fetch"),
      };
    }
  }

  /**
   * Save core homepage settings (personal, meta, hero, about, contact, sectionsConfig).
   */
  async saveDraft(draft: PortfolioDraft): Promise<RepositoryActionResult> {
    saveDraftToStorage(draft);

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }

    try {
      const { error: settingsError } = await supabase
        .from("portfolio_settings")
        .upsert(
          {
            id: 1,
            personal: draft.personal as unknown as Json,
            statement_alternatives: draft.statementAlternatives as unknown as Json,
            meta: draft.meta as unknown as Json,
            hero: draft.hero as unknown as Json,
            about: draft.about as unknown as Json,
            contact: draft.contact as unknown as Json,
            social: draft.social as unknown as Json,
            recognition: draft.recognition as unknown as Json,
            nav_sections: draft.navSections as unknown as Json,
            sections_config: (draft.sectionsConfig || {}) as unknown as Json,
          },
          { onConflict: "id" }
        );

      if (settingsError) {
        return {
          success: false,
          error: translateDatabaseError(settingsError, "Homepage & Profile"),
          source: "localStorage",
        };
      }

      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Homepage & Profile"),
        source: "localStorage",
      };
    }
  }

  /**
   * Upsert a project AND sync its project_technologies and project_skills links.
   */
  async upsertProject(
    project: MutableProject,
    sortOrder: number
  ): Promise<RepositoryActionResult> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }

    try {
      const { error } = await supabase.from("projects").upsert(
        {
          id: project.id,
          index: project.index,
          name: project.name,
          full_title: project.fullTitle,
          category: project.category,
          summary: project.summary,
          featured: project.featured,
          status: project.status,
          visibility: project.visibility,
          is_published: project.isPublished ?? true,
          github: project.github,
          live_url: project.liveUrl,
          image: project.image,
          detail: project.detail as unknown as Json,
          sort_order: sortOrder,
        },
        { onConflict: "id" }
      );

      if (error) {
        return {
          success: false,
          error: translateDatabaseError(error, "Projects"),
          source: "localStorage",
        };
      }

      // Sync project_technologies cleanly
      const { data: existingTechs } = await supabase.from("technologies").select("*");
      const byNormalized = new Map(
        (existingTechs || []).map((t) => [t.normalized_name.toLowerCase(), t.id])
      );
      const byName = new Map(
        (existingTechs || []).map((t) => [t.name.toLowerCase(), t.id])
      );

      const resolvedTechIds: string[] = [];
      for (const techName of project.tech) {
        const cleanName = techName.trim();
        if (!cleanName) continue;
        const norm = slugifyId(cleanName);
        let techId = byName.get(cleanName.toLowerCase()) || byNormalized.get(norm);
        if (!techId) {
          techId = norm;
          const { error: insertTechErr } = await supabase.from("technologies").upsert(
            {
              id: techId,
              name: cleanName,
              normalized_name: norm,
              is_visible: true,
            },
            { onConflict: "id" }
          );
          if (insertTechErr) {
            return {
              success: false,
              error: translateDatabaseError(insertTechErr, "Technologies"),
              source: "localStorage",
            };
          }
        }
        if (!resolvedTechIds.includes(techId)) {
          resolvedTechIds.push(techId);
        }
      }

      await supabase
        .from("project_technologies")
        .delete()
        .eq("project_id", project.id);

      if (resolvedTechIds.length > 0) {
        const ptRows = resolvedTechIds.map((tid, idx) => ({
          project_id: project.id,
          technology_id: tid,
          sort_order: idx + 1,
        }));
        const { error: ptErr } = await supabase
          .from("project_technologies")
          .insert(ptRows);
        if (ptErr) {
          return {
            success: false,
            error: translateDatabaseError(ptErr, "Project technologies"),
            source: "localStorage",
          };
        }
      }

      // Sync project_skills cleanly
      await supabase.from("project_skills").delete().eq("project_id", project.id);
      const skillIds = Array.from(new Set(project.skillIds || []));
      if (skillIds.length > 0) {
        const psRows = skillIds.map((sid, idx) => ({
          project_id: project.id,
          skill_id: sid,
          relationship_type: "uses",
          sort_order: idx + 1,
        }));
        const { error: psErr } = await supabase.from("project_skills").insert(psRows);
        if (psErr) {
          return {
            success: false,
            error: translateDatabaseError(psErr, "Project skills"),
            source: "localStorage",
          };
        }
      }

      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Projects"),
        source: "localStorage",
      };
    }
  }

  /**
   * Persist ordered project list (e.g. after reordering or toggling publish).
   */
  async syncProjectOrdering(projects: MutableProject[]): Promise<RepositoryActionResult> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }
    try {
      for (let i = 0; i < projects.length; i++) {
        const p = projects[i]!;
        const { error } = await supabase
          .from("projects")
          .update({ sort_order: i + 1, is_published: p.isPublished ?? true })
          .eq("id", p.id);
        if (error) {
          return {
            success: false,
            error: translateDatabaseError(error, "Project ordering"),
            source: "localStorage",
          };
        }
      }
      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Project ordering"),
        source: "localStorage",
      };
    }
  }

  async deleteProject(id: string): Promise<RepositoryActionResult> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) {
        return {
          success: false,
          error: translateDatabaseError(error, "Delete project"),
          source: "localStorage",
        };
      }
      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Delete project"),
        source: "localStorage",
      };
    }
  }

  /**
   * Synchronize skill_categories and their child skills cleanly.
   */
  async syncSkillsTaxonomy(
    categories: MutableSkillCategory[]
  ): Promise<RepositoryActionResult> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }

    try {
      const { data: existingCats } = await supabase.from("skill_categories").select("id");
      const nextCatIds = new Set(categories.map((c) => c.id));
      for (const old of existingCats || []) {
        if (!nextCatIds.has(old.id)) {
          await supabase.from("skill_categories").delete().eq("id", old.id);
        }
      }

      for (let cIdx = 0; cIdx < categories.length; cIdx++) {
        const cat = categories[cIdx]!;
        const { error: catErr } = await supabase.from("skill_categories").upsert(
          {
            id: cat.id,
            label: cat.label,
            display_index: cat.index,
            caption: cat.caption,
            sort_order: cIdx + 1,
            is_visible: cat.isVisible ?? true,
          },
          { onConflict: "id" }
        );
        if (catErr) {
          return {
            success: false,
            error: translateDatabaseError(catErr, "Skill categories"),
            source: "localStorage",
          };
        }

        // Sync skills belonging to this category
        const desiredSkillIds = new Set<string>();
        const skillsToUpsert = cat.items.map((name, sIdx) => {
          const slug = slugifyId(name);
          const id = `${cat.id}:${slug}`;
          desiredSkillIds.add(id);
          const existingRec = cat.skillRecords?.find((r) => r.id === id);
          return {
            id,
            category_id: cat.id,
            name: name.trim(),
            sort_order: sIdx + 1,
            is_visible: existingRec ? existingRec.isVisible : true,
          };
        });

        const { data: currentCatSkills } = await supabase
          .from("skills")
          .select("id")
          .eq("category_id", cat.id);

        for (const s of currentCatSkills || []) {
          if (!desiredSkillIds.has(s.id)) {
            await supabase.from("skills").delete().eq("id", s.id);
          }
        }

        if (skillsToUpsert.length > 0) {
          const { error: sErr } = await supabase
            .from("skills")
            .upsert(skillsToUpsert, { onConflict: "id" });
          if (sErr) {
            return {
              success: false,
              error: translateDatabaseError(sErr, "Skills"),
              source: "localStorage",
            };
          }
        }
      }

      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Skills"),
        source: "localStorage",
      };
    }
  }

  async upsertTechnology(tech: MutableTechnology): Promise<RepositoryActionResult> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }
    try {
      const { error } = await supabase.from("technologies").upsert(
        {
          id: tech.id,
          name: tech.name,
          normalized_name: tech.normalizedName || slugifyId(tech.name),
          color_override: tech.colorOverride,
          is_visible: tech.isVisible,
          description: tech.description,
        },
        { onConflict: "id" }
      );
      if (error) {
        return {
          success: false,
          error: translateDatabaseError(error, "Technologies"),
          source: "localStorage",
        };
      }
      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Technologies"),
        source: "localStorage",
      };
    }
  }

  async deleteTechnology(id: string): Promise<RepositoryActionResult> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }
    try {
      const { error } = await supabase.from("technologies").delete().eq("id", id);
      if (error) {
        return {
          success: false,
          error: translateDatabaseError(error, "Delete technology"),
          source: "localStorage",
        };
      }
      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Delete technology"),
        source: "localStorage",
      };
    }
  }

  async syncExperience(items: MutableExperienceItem[]): Promise<RepositoryActionResult> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }
    try {
      const { data: existing } = await supabase.from("experience").select("id");
      const nextIds = new Set(items.map((x) => x.id));
      for (const old of existing || []) {
        if (!nextIds.has(old.id)) {
          await supabase.from("experience").delete().eq("id", old.id);
        }
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const { error } = await supabase.from("experience").upsert(
          {
            id: item.id,
            role: item.role,
            organisation: item.organisation,
            period: item.period,
            location: item.location,
            duration: item.duration,
            current: item.current,
            summary: item.summary,
            sort_order: i + 1,
            is_visible: item.isVisible ?? true,
          },
          { onConflict: "id" }
        );
        if (error) {
          return {
            success: false,
            error: translateDatabaseError(error, "Experience"),
            source: "localStorage",
          };
        }

        await supabase.from("experience_highlights").delete().eq("experience_id", item.id);
        if (item.highlights.length > 0) {
          await supabase.from("experience_highlights").insert(
            item.highlights.map((h, hIdx) => ({
              experience_id: item.id,
              content: h,
              sort_order: hIdx + 1,
            }))
          );
        }

        await supabase
          .from("experience_technologies")
          .delete()
          .eq("experience_id", item.id);
        if (item.tech.length > 0) {
          for (let tIdx = 0; tIdx < item.tech.length; tIdx++) {
            const techName = item.tech[tIdx]!;
            const tid = slugifyId(techName);
            await supabase
              .from("technologies")
              .upsert(
                { id: tid, name: techName, normalized_name: tid },
                { onConflict: "id" }
              );
            await supabase
              .from("experience_technologies")
              .upsert(
                { experience_id: item.id, technology_id: tid, sort_order: tIdx + 1 },
                { onConflict: "experience_id,technology_id" }
              );
          }
        }
      }

      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Experience"),
        source: "localStorage",
      };
    }
  }

  async syncEducation(items: MutableEducationItem[]): Promise<RepositoryActionResult> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }
    try {
      const { data: existing } = await supabase.from("education").select("id");
      const nextIds = new Set(items.map((x) => x.id));
      for (const old of existing || []) {
        if (!nextIds.has(old.id)) {
          await supabase.from("education").delete().eq("id", old.id);
        }
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const { error } = await supabase.from("education").upsert(
          {
            id: item.id,
            qualification: item.qualification,
            award: item.award,
            institution: item.institution,
            period: item.period,
            location: item.location,
            current: item.current,
            sort_order: i + 1,
            is_visible: item.isVisible ?? true,
          },
          { onConflict: "id" }
        );
        if (error) {
          return {
            success: false,
            error: translateDatabaseError(error, "Education"),
            source: "localStorage",
          };
        }

        await supabase.from("education_details").delete().eq("education_id", item.id);
        if (item.details.length > 0) {
          await supabase.from("education_details").insert(
            item.details.map((d, dIdx) => ({
              education_id: item.id,
              content: d,
              sort_order: dIdx + 1,
            }))
          );
        }
      }

      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Education"),
        source: "localStorage",
      };
    }
  }

  async syncCertifications(items: MutableCertification[]): Promise<RepositoryActionResult> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }
    try {
      const { data: existing } = await supabase.from("certifications").select("id");
      const nextIds = new Set(items.map((x) => x.id));
      for (const old of existing || []) {
        if (!nextIds.has(old.id)) {
          await supabase.from("certifications").delete().eq("id", old.id);
        }
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const { error } = await supabase.from("certifications").upsert(
          {
            id: item.id,
            name: item.name,
            issuer: item.issuer,
            issued: item.issued,
            credential_id: item.credentialId,
            credential_url: item.credentialUrl,
            sort_order: i + 1,
            is_visible: item.isVisible ?? true,
          },
          { onConflict: "id" }
        );
        if (error) {
          return {
            success: false,
            error: translateDatabaseError(error, "Certifications"),
            source: "localStorage",
          };
        }
      }
      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Certifications"),
        source: "localStorage",
      };
    }
  }

  async syncAchievements(items: MutableAchievement[]): Promise<RepositoryActionResult> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }
    try {
      const { data: existing } = await supabase.from("achievements").select("id");
      const nextIds = new Set(items.map((x) => x.id));
      for (const old of existing || []) {
        if (!nextIds.has(old.id)) {
          await supabase.from("achievements").delete().eq("id", old.id);
        }
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const { error } = await supabase.from("achievements").upsert(
          {
            id: item.id,
            name: item.name,
            result: item.result,
            context: item.context,
            date: item.date,
            sort_order: i + 1,
            is_visible: item.isVisible ?? true,
          },
          { onConflict: "id" }
        );
        if (error) {
          return {
            success: false,
            error: translateDatabaseError(error, "Achievements"),
            source: "localStorage",
          };
        }
      }
      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Achievements"),
        source: "localStorage",
      };
    }
  }

  async syncExploring(items: MutableExploringItem[]): Promise<RepositoryActionResult> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }
    try {
      const { data: existing } = await supabase.from("exploring_items").select("id");
      const nextIds = new Set(items.map((x) => x.id));
      for (const old of existing || []) {
        if (!nextIds.has(old.id)) {
          await supabase.from("exploring_items").delete().eq("id", old.id);
        }
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const { error } = await supabase.from("exploring_items").upsert(
          {
            id: item.id,
            index: item.index,
            label: item.label,
            caption: item.caption,
            sort_order: i + 1,
            is_visible: item.isVisible ?? true,
          },
          { onConflict: "id" }
        );
        if (error) {
          return {
            success: false,
            error: translateDatabaseError(error, "Exploring items"),
            source: "localStorage",
          };
        }
      }
      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Exploring items"),
        source: "localStorage",
      };
    }
  }

  /**
   * Persist Tech City appearance settings, node layouts & custom edges.
   */
  async saveTechCityConfig(config: TechCityConfig): Promise<RepositoryActionResult> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }

    try {
      const { appearance, layouts, customEdges } = config;
      const { error: gsErr } = await supabase.from("globe_settings").upsert(
        {
          id: 1,
          core_label: appearance.coreLabel,
          core_subtitle: appearance.coreSubtitle,
          visual_config: {
            palettePreset: appearance.palettePreset,
            bloomEnabled: appearance.bloomEnabled,
            fogDensity: appearance.fogDensity,
            particleDensity: appearance.particleDensity,
            roadOpacity: appearance.roadOpacity,
            autoOrbitSpeed: appearance.autoOrbitSpeed,
            buildingStyleDefault: appearance.buildingStyleDefault,
          } as unknown as Json,
          layout_config: {
            cameraDistance: appearance.cameraDistance,
            cameraPitch: appearance.cameraPitch,
            cityScale: appearance.cityScale,
          } as unknown as Json,
        },
        { onConflict: "id" }
      );
      if (gsErr) {
        return {
          success: false,
          error: translateDatabaseError(gsErr, "Tech City appearance"),
          source: "localStorage",
        };
      }

      // Sync layouts
      const { data: existingLayouts } = await supabase
        .from("globe_node_layouts")
        .select("entity_type, entity_id");
      const nextLayoutKeys = new Set(
        layouts.map((l) => `${l.entityType}:${l.entityId}`)
      );
      for (const old of existingLayouts || []) {
        if (!nextLayoutKeys.has(`${old.entity_type}:${old.entity_id}`)) {
          await supabase
            .from("globe_node_layouts")
            .delete()
            .eq("entity_type", old.entity_type)
            .eq("entity_id", old.entity_id);
        }
      }
      for (const l of layouts) {
        const { error: lErr } = await supabase.from("globe_node_layouts").upsert(
          {
            entity_type: l.entityType,
            entity_id: l.entityId,
            position_x: l.positionX,
            position_y: l.positionY,
            position_z: l.positionZ,
            radius: l.radius,
            color_override: l.colorOverride,
            style_preset: l.stylePreset,
            is_locked: l.isLocked,
            sort_order: l.sortOrder,
            is_visible: l.isVisible,
          },
          { onConflict: "entity_type,entity_id" }
        );
        if (lErr) {
          return {
            success: false,
            error: translateDatabaseError(lErr, "Tech City layout"),
            source: "localStorage",
          };
        }
      }

      // Sync custom edges
      const { data: existingEdges } = await supabase
        .from("globe_custom_edges")
        .select("id");
      const nextEdgeIds = new Set(customEdges.map((e) => e.id));
      for (const old of existingEdges || []) {
        if (!nextEdgeIds.has(old.id)) {
          await supabase.from("globe_custom_edges").delete().eq("id", old.id);
        }
      }
      for (let i = 0; i < customEdges.length; i++) {
        const ce = customEdges[i]!;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          ce.id
        );
        const { error: ceErr } = await supabase.from("globe_custom_edges").upsert(
          {
            ...(isUuid ? { id: ce.id } : {}),
            source_type: ce.sourceType,
            source_id: ce.sourceId,
            target_type: ce.targetType,
            target_id: ce.targetId,
            relationship_type: ce.relationshipType,
            strength: ce.strength,
            sort_order: i + 1,
            is_visible: ce.isVisible,
          },
          { onConflict: "source_type,source_id,target_type,target_id,relationship_type" }
        );
        if (ceErr) {
          return {
            success: false,
            error: translateDatabaseError(ceErr, "Tech City connections"),
            source: "localStorage",
          };
        }
      }

      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Tech City configuration"),
        source: "localStorage",
      };
    }
  }

  /**
   * Synchronizes the ENTIRE PortfolioDraft atomically across all PostgreSQL tables
   * (used during Reconciliation import or full workspace save).
   */
  async syncFullDraftToRemote(draft: PortfolioDraft): Promise<RepositoryActionResult> {
    const settingsRes = await this.saveDraft(draft);
    if (!settingsRes.success && isSupabaseConfigured()) return settingsRes;

    const skillsRes = await this.syncSkillsTaxonomy(draft.skills);
    if (!skillsRes.success) return skillsRes;

    for (let i = 0; i < draft.projects.length; i++) {
      const pRes = await this.upsertProject(draft.projects[i]!, i + 1);
      if (!pRes.success) return pRes;
    }

    const expRes = await this.syncExperience(draft.experience);
    if (!expRes.success) return expRes;

    const eduRes = await this.syncEducation(draft.education);
    if (!eduRes.success) return eduRes;

    const certRes = await this.syncCertifications(draft.certifications);
    if (!certRes.success) return certRes;

    const achRes = await this.syncAchievements(draft.achievements);
    if (!achRes.success) return achRes;

    const expItemsRes = await this.syncExploring(draft.exploring);
    if (!expItemsRes.success) return expItemsRes;

    if (draft.cityConfig) {
      const cityRes = await this.saveTechCityConfig(draft.cityConfig);
      if (!cityRes.success) return cityRes;
    }

    return { success: true, source: "supabase" };
  }

  /**
   * Media Asset database registry operations
   */
  async upsertMediaAsset(
    asset: Omit<MutableMediaAsset, "id"> & { id?: string }
  ): Promise<RepositoryActionResult> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }
    try {
      const { error } = await supabase.from("media_assets").upsert(
        {
          ...(asset.id ? { id: asset.id } : {}),
          filename: asset.filename,
          original_filename: asset.originalFilename ?? asset.filename,
          bucket_id: asset.bucketId,
          storage_path: asset.storagePath,
          mime_type: asset.mimeType,
          size_bytes: asset.sizeBytes ?? null,
          alt_text: asset.altText,
          media_type: asset.mediaType ?? "image",
          entity_type: asset.entityType ?? null,
          entity_id: asset.entityId ?? null,
          is_published: asset.isPublished,
        },
        { onConflict: "storage_path" }
      );
      if (error) {
        return {
          success: false,
          error: translateDatabaseError(error, "Media Library"),
          source: "localStorage",
        };
      }
      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Media Library"),
        source: "localStorage",
      };
    }
  }

  async deleteMediaAssetRecord(id: string): Promise<RepositoryActionResult> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: true, source: "localStorage" };
    }
    try {
      const { error } = await supabase.from("media_assets").delete().eq("id", id);
      if (error) {
        return {
          success: false,
          error: translateDatabaseError(error, "Delete media"),
          source: "localStorage",
        };
      }
      return { success: true, source: "supabase" };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Delete media"),
        source: "localStorage",
      };
    }
  }

  /**
   * Atomic Publishing via PostgreSQL `publish_portfolio_snapshot` RPC
   */
  async publishChanges(
    draft: PortfolioDraft,
    changedSections: string[],
    notes?: string
  ): Promise<RepositoryActionResult<{ version: number; publishedAt: string }>> {
    const issues = validateDraftForPublication(draft);
    if (issues.length > 0) {
      return {
        success: false,
        error: `Validation failed (${issues[0]!.section}): ${issues[0]!.message}`,
        source: "localStorage",
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return {
        success: false,
        error: "Supabase is not configured. Connect Supabase to publish live snapshots.",
        source: "localStorage",
      };
    }

    try {
      const { data, error } = await supabase.rpc("publish_portfolio_snapshot", {
        p_changed_sections: changedSections,
        p_notes: notes ?? null,
      });

      if (error) {
        return {
          success: false,
          error: translateDatabaseError(error, "Publish"),
          source: "supabase",
        };
      }

      const result = data as { version: number; publishedAt: string } | null;
      return {
        success: true,
        data: result || { version: 1, publishedAt: new Date().toISOString() },
        source: "supabase",
      };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Publish"),
        source: "supabase",
      };
    }
  }

  async loadPublicationHistory(): Promise<PublicationHistoryItem[]> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("publication_history")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(30);

      if (error || !data) return [];
      return data.map((row) => ({
        id: row.id,
        version: row.version,
        action: row.action as PublicationHistoryItem["action"],
        status: row.status as PublicationHistoryItem["status"],
        changedSections: row.changed_sections || [],
        summary: row.summary,
        publishedAt: row.published_at,
        publishedByEmail: row.published_by_email,
        payload: sanitizeDraft(row.payload as unknown as PortfolioDraft),
      }));
    } catch {
      return [];
    }
  }

  async rollbackToVersion(
    historyId: string
  ): Promise<RepositoryActionResult<{ version: number; restoredFromVersion: number }>> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return { success: false, error: "Supabase not configured.", source: "localStorage" };
    }

    try {
      const { data, error } = await supabase.rpc("rollback_portfolio_snapshot", {
        p_history_id: historyId,
      });
      if (error) {
        return {
          success: false,
          error: translateDatabaseError(error, "Rollback"),
          source: "supabase",
        };
      }
      return {
        success: true,
        data: data as { version: number; restoredFromVersion: number },
        source: "supabase",
      };
    } catch (err) {
      return {
        success: false,
        error: translateDatabaseError(err, "Rollback"),
        source: "supabase",
      };
    }
  }
}

export const portfolioRepository = new PortfolioRepository();
