/**
 * Tech City Unified Data Provider
 * ─────────────────────────────────────────────────────────────────────────────
 * Ensures public Tech City consumes the EXACT same published/preview dataset
 * as the public homepage (`PublicPortfolioProvider`), while also supporting
 * standalone CMS previews with explicit draft injection.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PortfolioDraft } from "@/lib/cms/types";
import { getBaselinePortfolio } from "@/lib/cms/storage";
import { portfolioRepository, type PersistenceSource } from "@/lib/portfolio/repository";

export interface CityDataSnapshot {
  draft: PortfolioDraft;
  source: PersistenceSource;
}

export function getInitialCityData(): CityDataSnapshot {
  return {
    draft: getBaselinePortfolio(),
    source: "baseline",
  };
}

export async function loadLiveCityData(): Promise<CityDataSnapshot> {
  const res = await portfolioRepository.loadPublishedPortfolio();
  return {
    draft: res.draft,
    source: res.source,
  };
}

export function subscribeToCityDataUpdates(
  onUpdate: (snapshot: CityDataSnapshot) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<PortfolioDraft | null>;
    if (customEvent.detail) {
      onUpdate({ draft: customEvent.detail, source: "localStorage" });
    } else {
      onUpdate({ draft: getBaselinePortfolio(), source: "baseline" });
    }
  };

  window.addEventListener("portfolio_draft_changed", handler);
  return () => {
    window.removeEventListener("portfolio_draft_changed", handler);
  };
}
