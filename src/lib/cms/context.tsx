"use client";

/**
 * React Context providing reactive access to the CMS workspace state.
 * Bridges Supabase working tables, local browser backups, publication state,
 * authentication status, and human-readable mutation feedback.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { User } from "@supabase/supabase-js";
import type {
  PortfolioDraft,
  MutableProject,
  MutableSkillCategory,
  MutableTechnology,
  MutableExperienceItem,
  MutableEducationItem,
  MutableCertification,
  MutableAchievement,
  TechCityConfig,
  PublicationHistoryItem,
} from "./types";
import {
  getBaselinePortfolio,
  hasSavedLocalDraft,
  loadDraftFromStorage,
  resetDraftInStorage,
  saveDraftToStorage,
} from "./storage";
import {
  portfolioRepository,
  type PersistenceSource,
  type RepositoryActionResult,
} from "@/lib/portfolio/repository";
import { compareLocalAndRemoteDrafts } from "@/lib/portfolio/reconciliation";
import { getCurrentAdmin, signOutAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";

interface PortfolioDraftContextType {
  draft: PortfolioDraft;
  publishedDraft: PortfolioDraft | null;
  remoteDraft: PortfolioDraft | null;
  hasLocalBackup: boolean;
  localBackupDiffCount: number;
  isHydrated: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  lastSaved: string | null;
  persistenceSource: PersistenceSource;
  syncError: string | null;
  unpublishedSections: string[];
  hasUnpublishedChanges: boolean;
  adminUser: User | null;
  isAdminVerified: boolean;
  authChecked: boolean;
  publicationHistory: PublicationHistoryItem[];
  updateDraft: (updater: (prev: PortfolioDraft) => PortfolioDraft) => boolean;
  saveCurrentDraft: (newDraft: PortfolioDraft) => Promise<boolean>;
  saveProjectAndSync: (
    project: MutableProject,
    sortOrder: number
  ) => Promise<RepositoryActionResult>;
  deleteProjectAndSync: (id: string) => Promise<RepositoryActionResult>;
  saveProjectsOrderAndSync: (
    projects: MutableProject[]
  ) => Promise<RepositoryActionResult>;
  saveSkillsAndSync: (
    categories: MutableSkillCategory[]
  ) => Promise<RepositoryActionResult>;
  saveTechnologyAndSync: (
    tech: MutableTechnology
  ) => Promise<RepositoryActionResult>;
  deleteTechnologyAndSync: (id: string) => Promise<RepositoryActionResult>;
  saveExperienceAndSync: (
    items: MutableExperienceItem[]
  ) => Promise<RepositoryActionResult>;
  saveEducationAndSync: (
    items: MutableEducationItem[]
  ) => Promise<RepositoryActionResult>;
  saveCertificationsAndSync: (
    items: MutableCertification[]
  ) => Promise<RepositoryActionResult>;
  saveAchievementsAndSync: (
    items: MutableAchievement[]
  ) => Promise<RepositoryActionResult>;
  saveCityConfigAndSync: (
    config: TechCityConfig
  ) => Promise<RepositoryActionResult>;
  publishWorkspace: (
    notes?: string
  ) => Promise<RepositoryActionResult<{ version: number; publishedAt: string }>>;
  rollbackToHistory: (
    historyId: string
  ) => Promise<RepositoryActionResult<{ version: number; restoredFromVersion: number }>>;
  refreshFromRemote: () => Promise<void>;
  resetToBaseline: () => void;
  signOut: () => Promise<void>;
}

const PortfolioDraftContext = createContext<PortfolioDraftContextType | null>(null);

export function PortfolioDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<PortfolioDraft>(getBaselinePortfolio);
  const [publishedDraft, setPublishedDraft] = useState<PortfolioDraft | null>(null);
  const [remoteDraft, setRemoteDraft] = useState<PortfolioDraft | null>(null);
  const [hasLocalBackup, setHasLocalBackup] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [persistenceSource, setPersistenceSource] =
    useState<PersistenceSource>("baseline");
  const [syncError, setSyncError] = useState<string | null>(null);

  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [publicationHistory, setPublicationHistory] = useState<PublicationHistoryItem[]>(
    []
  );

  const refreshFromRemote = useCallback(async () => {
    setHasLocalBackup(hasSavedLocalDraft());
    const authRes = await getCurrentAdmin();
    setAdminUser(authRes.user);
    setIsAdminVerified(authRes.isAdmin);
    setAuthChecked(true);

    const [workingRes, pubRes, history] = await Promise.all([
      portfolioRepository.loadPortfolio(),
      portfolioRepository.loadPublishedPortfolio(),
      authRes.isAdmin
        ? portfolioRepository.loadPublicationHistory()
        : Promise.resolve([]),
    ]);

    setDraft(workingRes.draft);
    setPersistenceSource(workingRes.source);
    setLastSaved(workingRes.draft.lastModified);
    if (workingRes.source === "supabase") {
      setRemoteDraft(workingRes.draft);
    }
    if (pubRes.source === "supabase" || pubRes.source === "cache") {
      setPublishedDraft(pubRes.draft);
    }
    setPublicationHistory(history);
    if (workingRes.error) {
      setSyncError(workingRes.error);
    } else {
      setSyncError(null);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    refreshFromRemote().catch((err) => {
      if (!mounted) return;
      console.warn("Failed to initialize CMS workspace:", err);
      setDraft(loadDraftFromStorage());
      setPersistenceSource("localStorage");
      setAuthChecked(true);
      setIsHydrated(true);
    });

    const handleExternalChange = (e: Event) => {
      const customEvent = e as CustomEvent<PortfolioDraft | null>;
      setHasLocalBackup(hasSavedLocalDraft());
      if (customEvent.detail) {
        setDraft(customEvent.detail);
        setLastSaved(customEvent.detail.lastModified);
      } else {
        setDraft(getBaselinePortfolio());
        setLastSaved(null);
      }
    };

    window.addEventListener("portfolio_draft_changed", handleExternalChange);
    return () => {
      mounted = false;
      window.removeEventListener("portfolio_draft_changed", handleExternalChange);
    };
  }, [refreshFromRemote]);

  const unpublishedSections = useMemo(() => {
    if (!publishedDraft) return [];
    const report = compareLocalAndRemoteDrafts(draft, publishedDraft);
    const sections = new Set<string>();
    report.items.forEach((item) => {
      if (item.status !== "synced") sections.add(item.section);
    });
    if (JSON.stringify(draft.cityConfig) !== JSON.stringify(publishedDraft.cityConfig)) {
      sections.add("Tech City");
    }
    if (
      JSON.stringify(draft.sectionsConfig) !==
      JSON.stringify(publishedDraft.sectionsConfig)
    ) {
      sections.add("Homepage Layout");
    }
    return Array.from(sections);
  }, [draft, publishedDraft]);

  const localBackupDiffCount = useMemo(() => {
    if (!hasLocalBackup || !remoteDraft) return 0;
    const local = loadDraftFromStorage();
    const report = compareLocalAndRemoteDrafts(local, remoteDraft);
    return report.localOnlyCount + report.modifiedCount;
  }, [hasLocalBackup, remoteDraft]);

  const saveCurrentDraft = useCallback(async (newDraft: PortfolioDraft): Promise<boolean> => {
    setIsSaving(true);
    setSyncError(null);
    try {
      const result = await portfolioRepository.saveDraft(newDraft);
      setDraft(newDraft);
      setLastSaved(new Date().toISOString());
      setPersistenceSource(result.source);
      if (!result.success && result.error) {
        setSyncError(result.error);
      }
      setIsSaving(false);
      return result.success;
    } catch (err) {
      setIsSaving(false);
      setSyncError(err instanceof Error ? err.message : "Save failed");
      return false;
    }
  }, []);

  const updateDraft = useCallback(
    (updater: (prev: PortfolioDraft) => PortfolioDraft): boolean => {
      setIsSaving(true);
      setDraft((prev) => {
        const next = updater(prev);
        saveDraftToStorage(next);
        setLastSaved(new Date().toISOString());
        portfolioRepository.saveDraft(next).then((res) => {
          setPersistenceSource(res.source);
          if (!res.success && res.error) setSyncError(res.error);
          else setSyncError(null);
          setIsSaving(false);
        });
        return next;
      });
      return true;
    },
    []
  );

  async function runSyncAction<T>(
    updater: (prev: PortfolioDraft) => PortfolioDraft,
    remoteFn: () => Promise<RepositoryActionResult<T>>
  ): Promise<RepositoryActionResult<T>> {
    setIsSaving(true);
    setSyncError(null);
    let updated!: PortfolioDraft;
    setDraft((prev) => {
      updated = updater(prev);
      saveDraftToStorage(updated);
      return updated;
    });
    const res = await remoteFn();
    setLastSaved(new Date().toISOString());
    if (res.source === "supabase") {
      setPersistenceSource("supabase");
      setRemoteDraft(updated);
    }
    if (!res.success && res.error) {
      setSyncError(res.error);
    }
    setIsSaving(false);
    return res;
  }

  const saveProjectAndSync = useCallback(
    (project: MutableProject, sortOrder: number) =>
      runSyncAction(
        (prev) => {
          const list = [...prev.projects];
          const idx = list.findIndex((p) => p.id === project.id);
          if (idx !== -1) list[idx] = project;
          else list.push(project);
          return { ...prev, projects: list };
        },
        () => portfolioRepository.upsertProject(project, sortOrder)
      ),
    []
  );

  const deleteProjectAndSync = useCallback(
    (id: string) =>
      runSyncAction(
        (prev) => ({
          ...prev,
          projects: prev.projects.filter((p) => p.id !== id),
        }),
        () => portfolioRepository.deleteProject(id)
      ),
    []
  );

  const saveProjectsOrderAndSync = useCallback(
    (projects: MutableProject[]) =>
      runSyncAction(
        (prev) => ({ ...prev, projects }),
        () => portfolioRepository.syncProjectOrdering(projects)
      ),
    []
  );

  const saveSkillsAndSync = useCallback(
    (categories: MutableSkillCategory[]) =>
      runSyncAction(
        (prev) => ({ ...prev, skills: categories }),
        () => portfolioRepository.syncSkillsTaxonomy(categories)
      ),
    []
  );

  const saveTechnologyAndSync = useCallback(
    (tech: MutableTechnology) =>
      runSyncAction(
        (prev) => {
          const current = prev.technologies || [];
          const idx = current.findIndex((t) => t.id === tech.id);
          const next = [...current];
          if (idx !== -1) next[idx] = tech;
          else next.push(tech);
          return { ...prev, technologies: next };
        },
        () => portfolioRepository.upsertTechnology(tech)
      ),
    []
  );

  const deleteTechnologyAndSync = useCallback(
    (id: string) =>
      runSyncAction(
        (prev) => ({
          ...prev,
          technologies: (prev.technologies || []).filter((t) => t.id !== id),
        }),
        () => portfolioRepository.deleteTechnology(id)
      ),
    []
  );

  const saveExperienceAndSync = useCallback(
    (items: MutableExperienceItem[]) =>
      runSyncAction(
        (prev) => ({ ...prev, experience: items }),
        () => portfolioRepository.syncExperience(items)
      ),
    []
  );

  const saveEducationAndSync = useCallback(
    (items: MutableEducationItem[]) =>
      runSyncAction(
        (prev) => ({ ...prev, education: items }),
        () => portfolioRepository.syncEducation(items)
      ),
    []
  );

  const saveCertificationsAndSync = useCallback(
    (items: MutableCertification[]) =>
      runSyncAction(
        (prev) => ({ ...prev, certifications: items }),
        () => portfolioRepository.syncCertifications(items)
      ),
    []
  );

  const saveAchievementsAndSync = useCallback(
    (items: MutableAchievement[]) =>
      runSyncAction(
        (prev) => ({ ...prev, achievements: items }),
        () => portfolioRepository.syncAchievements(items)
      ),
    []
  );

  const saveCityConfigAndSync = useCallback(
    (config: TechCityConfig) =>
      runSyncAction(
        (prev) => ({ ...prev, cityConfig: config }),
        () => portfolioRepository.saveTechCityConfig(config)
      ),
    []
  );

  const publishWorkspace = useCallback(
    async (notes?: string) => {
      setIsPublishing(true);
      setSyncError(null);
      const res = await portfolioRepository.publishChanges(
        draft,
        unpublishedSections,
        notes
      );
      if (res.success) {
        await refreshFromRemote();
      } else if (res.error) {
        setSyncError(res.error);
      }
      setIsPublishing(false);
      return res;
    },
    [draft, unpublishedSections, refreshFromRemote]
  );

  const rollbackToHistory = useCallback(
    async (historyId: string) => {
      setIsPublishing(true);
      setSyncError(null);
      const res = await portfolioRepository.rollbackToVersion(historyId);
      if (res.success) {
        await refreshFromRemote();
      } else if (res.error) {
        setSyncError(res.error);
      }
      setIsPublishing(false);
      return res;
    },
    [refreshFromRemote]
  );

  const resetToBaseline = useCallback(() => {
    const fresh = resetDraftInStorage();
    setDraft(fresh);
    setHasLocalBackup(false);
    setLastSaved(null);
    setSyncError(null);
  }, []);

  const signOut = useCallback(async () => {
    await signOutAdmin();
    setAdminUser(null);
    setIsAdminVerified(false);
  }, []);

  return (
    <PortfolioDraftContext.Provider
      value={{
        draft,
        publishedDraft,
        remoteDraft,
        hasLocalBackup,
        localBackupDiffCount,
        isHydrated,
        isSaving,
        isPublishing,
        lastSaved,
        persistenceSource,
        syncError,
        unpublishedSections,
        hasUnpublishedChanges: unpublishedSections.length > 0,
        adminUser,
        isAdminVerified,
        authChecked,
        publicationHistory,
        updateDraft,
        saveCurrentDraft,
        saveProjectAndSync,
        deleteProjectAndSync,
        saveProjectsOrderAndSync,
        saveSkillsAndSync,
        saveTechnologyAndSync,
        deleteTechnologyAndSync,
        saveExperienceAndSync,
        saveEducationAndSync,
        saveCertificationsAndSync,
        saveAchievementsAndSync,
        saveCityConfigAndSync,
        publishWorkspace,
        rollbackToHistory,
        refreshFromRemote,
        resetToBaseline,
        signOut,
      }}
    >
      {children}
    </PortfolioDraftContext.Provider>
  );
}

export function usePortfolioDraft() {
  const ctx = useContext(PortfolioDraftContext);
  if (!ctx) {
    throw new Error("usePortfolioDraft must be used within a PortfolioDraftProvider");
  }
  return ctx;
}

export function DevelopmentModeBanner() {
  const {
    persistenceSource,
    hasUnpublishedChanges,
    unpublishedSections,
    syncError,
    isAdminVerified,
  } = usePortfolioDraft();
  const configured = isSupabaseConfigured();

  return (
    <div className="space-y-2 mb-6">
      {persistenceSource === "supabase" ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--color-accent-dim)] bg-[var(--color-surface-2)] px-4 py-3"
        >
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-[var(--color-live)] motion-safe:animate-pulse"
            />
            <p className="text-small text-[var(--color-text)]">
              <strong className="font-medium text-[var(--color-accent)]">
                Supabase connected
              </strong>{" "}
              —{" "}
              {isAdminVerified
                ? "Changes save to PostgreSQL. Publish when ready for visitors."
                : "Read-only connection. Sign in with an administrator account to save to database."}
            </p>
          </div>
          {hasUnpublishedChanges ? (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 font-mono text-micro text-amber-200">
              Unpublished edits: {unpublishedSections.join(", ")}
            </span>
          ) : (
            <span className="font-mono text-micro uppercase tracking-[0.14em] text-[var(--color-live)]">
              In sync with live site
            </span>
          )}
        </div>
      ) : (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-4 py-3"
        >
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-[var(--color-accent-warm)] motion-safe:animate-pulse"
            />
            <p className="text-small text-[var(--color-text)]">
              <strong className="font-medium text-[var(--color-accent-warm)]">
                {configured ? "Offline / Fallback Draft Mode" : "Local Development Mode"}
              </strong>{" "}
              — Changes are backed up in this browser.
            </p>
          </div>
          <span className="font-mono text-micro uppercase tracking-[0.14em] text-[var(--color-subtle)]">
            Local Draft v2
          </span>
        </div>
      )}

      {syncError && (
        <div
          role="alert"
          className="rounded-[var(--radius-panel)] border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-small text-red-200"
        >
          {syncError}
        </div>
      )}
    </div>
  );
}
