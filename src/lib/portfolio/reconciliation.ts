import type { PortfolioDraft } from "@/lib/cms/types";

export type DiffStatus = "synced" | "local-only" | "modified" | "remote-only";

export interface ReconciliationItem {
  key: string;
  section: string;
  id: string;
  label: string;
  status: DiffStatus;
  statusLabel: string;
  detail: string;
}

export interface ReconciliationReport {
  items: ReconciliationItem[];
  hasDifferences: boolean;
  localOnlyCount: number;
  modifiedCount: number;
  remoteOnlyCount: number;
  syncedCount: number;
}

function stableSig(obj: unknown): string {
  return JSON.stringify(obj);
}

/**
 * Compares a browser local draft (`portfolio_cms_draft_v2`) against the remote
 * Supabase working state by stable entity IDs, preventing silent overwrites.
 */
export function compareLocalAndRemoteDrafts(
  local: PortfolioDraft,
  remote: PortfolioDraft
): ReconciliationReport {
  const items: ReconciliationItem[] = [];

  // 1. Homepage / Profile / Settings
  const profileLocal = {
    personal: local.personal,
    about: local.about,
    hero: local.hero,
    meta: local.meta,
    contact: local.contact,
  };
  const profileRemote = {
    personal: remote.personal,
    about: remote.about,
    hero: remote.hero,
    meta: remote.meta,
    contact: remote.contact,
  };
  const profileChanged = stableSig(profileLocal) !== stableSig(profileRemote);
  items.push({
    key: "settings:profile",
    section: "Homepage & Profile",
    id: "portfolio_settings",
    label: `${local.personal.name} — Homepage & Contact`,
    status: profileChanged ? "modified" : "synced",
    statusLabel: profileChanged ? "Conflict" : "Already synchronized",
    detail: profileChanged
      ? "Local profile, hero, or about copy differs from Supabase."
      : "Matches database version.",
  });

  // 2. Helper for array-of-objects entity comparison by `id`
  function compareCollection<T extends { id: string }>(
    section: string,
    localArr: T[],
    remoteArr: T[],
    getLabel: (item: T) => string,
    normalize?: (item: T) => unknown
  ) {
    const localMap = new Map(localArr.map((x) => [x.id, x]));
    const remoteMap = new Map(remoteArr.map((x) => [x.id, x]));
    const allIds = Array.from(new Set([...localMap.keys(), ...remoteMap.keys()]));

    for (const id of allIds) {
      const l = localMap.get(id);
      const r = remoteMap.get(id);
      if (l && !r) {
        items.push({
          key: `${section}:${id}`,
          section,
          id,
          label: getLabel(l),
          status: "local-only",
          statusLabel: "Ready to import",
          detail: "Present only in local browser draft.",
        });
      } else if (!l && r) {
        items.push({
          key: `${section}:${id}`,
          section,
          id,
          label: getLabel(r),
          status: "remote-only",
          statusLabel: "Database version",
          detail: "Present in Supabase database, absent from local browser draft.",
        });
      } else if (l && r) {
        const ls = stableSig(normalize ? normalize(l) : l);
        const rs = stableSig(normalize ? normalize(r) : r);
        const changed = ls !== rs;
        items.push({
          key: `${section}:${id}`,
          section,
          id,
          label: getLabel(l),
          status: changed ? "modified" : "synced",
          statusLabel: changed ? "Conflict" : "Already synchronized",
          detail: changed
            ? "Modified locally compared to database record."
            : "Matches database version.",
        });
      }
    }
  }

  compareCollection("Projects", local.projects, remote.projects, (p) => p.name, (p) => ({
    ...p,
    skillIds: [...(p.skillIds || [])].sort(),
    tech: [...p.tech],
  }));

  compareCollection(
    "Skills & Districts",
    local.skills,
    remote.skills,
    (c) => c.label,
    (c) => ({ id: c.id, label: c.label, index: c.index, caption: c.caption, items: c.items })
  );

  compareCollection("Experience", local.experience, remote.experience, (e) => `${e.role} @ ${e.organisation}`);
  compareCollection("Education", local.education, remote.education, (ed) => `${ed.award} — ${ed.qualification}`);
  compareCollection("Certifications", local.certifications, remote.certifications, (c) => c.name);
  compareCollection("Achievements", local.achievements, remote.achievements, (a) => a.name);

  const localOnlyCount = items.filter((i) => i.status === "local-only").length;
  const modifiedCount = items.filter((i) => i.status === "modified").length;
  const remoteOnlyCount = items.filter((i) => i.status === "remote-only").length;
  const syncedCount = items.filter((i) => i.status === "synced").length;

  return {
    items,
    hasDifferences: localOnlyCount + modifiedCount + remoteOnlyCount > 0,
    localOnlyCount,
    modifiedCount,
    remoteOnlyCount,
    syncedCount,
  };
}

/**
 * Produces a merged PortfolioDraft according to user resolution strategy:
 * - "import-local": merges local-only and locally modified items onto remote, preserving remote-only records
 * - "keep-remote": keeps the exact database state
 */
export function mergeDrafts(
  local: PortfolioDraft,
  remote: PortfolioDraft,
  strategy: "import-local" | "keep-remote"
): PortfolioDraft {
  if (strategy === "keep-remote") {
    return remote;
  }

  function mergeList<T extends { id: string }>(lArr: T[], rArr: T[]): T[] {
    const map = new Map(rArr.map((r) => [r.id, r]));
    const result: T[] = [];
    const seen = new Set<string>();
    for (const l of lArr) {
      result.push(l);
      seen.add(l.id);
    }
    for (const r of map.values()) {
      if (!seen.has(r.id)) {
        result.push(r);
      }
    }
    return result;
  }

  return {
    ...remote,
    personal: local.personal,
    statementAlternatives: local.statementAlternatives,
    meta: local.meta,
    hero: local.hero,
    about: local.about,
    contact: local.contact,
    social: local.social,
    sectionsConfig: local.sectionsConfig || remote.sectionsConfig,
    cityConfig: local.cityConfig || remote.cityConfig,
    projects: mergeList(local.projects, remote.projects),
    skills: mergeList(local.skills, remote.skills),
    experience: mergeList(local.experience, remote.experience),
    education: mergeList(local.education, remote.education),
    certifications: mergeList(local.certifications, remote.certifications),
    achievements: mergeList(local.achievements, remote.achievements),
    exploring: mergeList(local.exploring, remote.exploring),
  };
}
