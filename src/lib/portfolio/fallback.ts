/**
 * Last-Known-Good Published Cache & Emergency Baseline Fallback
 * ─────────────────────────────────────────────────────────────────────────────
 * Preserves the latest verified published portfolio snapshot in browser storage
 * so transient network/Supabase outages fall back gracefully without showing
 * an empty page or overwriting fresher content silently.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PortfolioDraft } from "@/lib/cms/types";
import { getBaselinePortfolio, sanitizeDraft, validatePortfolioDraft } from "@/lib/cms/storage";

const PUBLISHED_CACHE_KEY = "portfolio_published_cache_v1";

export interface CachedPublishedRecord {
  version: number;
  publishedAt: string | null;
  draft: PortfolioDraft;
}

export function loadPublishedCache(): CachedPublishedRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PUBLISHED_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedPublishedRecord>;
    if (parsed.draft && validatePortfolioDraft(parsed.draft)) {
      return {
        version: typeof parsed.version === "number" ? parsed.version : 1,
        publishedAt: parsed.publishedAt ?? null,
        draft: sanitizeDraft(parsed.draft),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function savePublishedCache(record: CachedPublishedRecord): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PUBLISHED_CACHE_KEY, JSON.stringify(record));
  } catch {
    // Ignore storage quota issues
  }
}

export function getFallbackPortfolio(): {
  draft: PortfolioDraft;
  source: "cache" | "baseline";
  version: number;
  publishedAt: string | null;
} {
  const cached = loadPublishedCache();
  if (cached) {
    return {
      draft: cached.draft,
      source: "cache",
      version: cached.version,
      publishedAt: cached.publishedAt,
    };
  }
  return {
    draft: getBaselinePortfolio(),
    source: "baseline",
    version: 0,
    publishedAt: null,
  };
}
