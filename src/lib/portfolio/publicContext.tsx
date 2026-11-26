"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { PortfolioDraft } from "@/lib/cms/types";
import { getBaselinePortfolio, loadDraftFromStorage } from "@/lib/cms/storage";
import { portfolioRepository } from "@/lib/portfolio/repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getCurrentAdmin } from "@/lib/supabase/auth";

interface PublicPortfolioContextValue {
  draft: PortfolioDraft;
  isLoaded: boolean;
  isPreviewMode: boolean;
  previewDenied: boolean;
  refresh: () => Promise<void>;
}

const PublicPortfolioContext = createContext<PublicPortfolioContextValue | null>(
  null,
);

export function PublicPortfolioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize synchronously from static baseline so SSR and first client paint match byte-for-byte
  const [draft, setDraft] = useState<PortfolioDraft>(() => getBaselinePortfolio());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewDenied, setPreviewDenied] = useState(false);

  const loadLiveState = useCallback(async () => {
    const wantsPreview =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("preview") === "1";

    if (wantsPreview) {
      if (isSupabaseConfigured()) {
        const auth = await getCurrentAdmin();
        if (auth.isAdmin) {
          const working = await portfolioRepository.loadPortfolio();
          setDraft(working.draft);
          setIsPreviewMode(true);
          setPreviewDenied(false);
          setIsLoaded(true);
          return;
        }
        setPreviewDenied(true);
      } else {
        const local = loadDraftFromStorage();
        setDraft(local ?? getBaselinePortfolio());
        setIsPreviewMode(true);
        setIsLoaded(true);
        return;
      }
    }

    const published = await portfolioRepository.loadPublishedPortfolio();
    setDraft(published.draft);
    setIsPreviewMode(false);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    void loadLiveState();
  }, [loadLiveState]);

  // Keep document title synchronized cleanly if changed in CMS
  useEffect(() => {
    if (isLoaded && draft.meta.title && typeof document !== "undefined") {
      if (window.location.pathname === "/") {
        document.title = draft.meta.title;
      }
    }
  }, [isLoaded, draft.meta.title]);

  // Subscribe to Realtime published snapshot updates and window focus refresh
  useEffect(() => {
    if (isPreviewMode || typeof window === "undefined") return;

    const handleFocus = () => {
      void loadLiveState();
    };
    window.addEventListener("focus", handleFocus);

    const supabase = getSupabaseClient();
    const channel = supabase
      ? supabase
          .channel("public-published-snapshots")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "published_snapshots",
            },
            () => {
              void loadLiveState();
            },
          )
          .subscribe()
      : null;

    return () => {
      window.removeEventListener("focus", handleFocus);
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [isPreviewMode, loadLiveState]);

  return (
    <PublicPortfolioContext.Provider
      value={{
        draft,
        isLoaded,
        isPreviewMode,
        previewDenied,
        refresh: loadLiveState,
      }}
    >
      {children}
    </PublicPortfolioContext.Provider>
  );
}

export function usePublicPortfolio(): PublicPortfolioContextValue {
  const ctx = useContext(PublicPortfolioContext);
  if (ctx) return ctx;
  return {
    draft: getBaselinePortfolio(),
    isLoaded: false,
    isPreviewMode: false,
    previewDenied: false,
    refresh: async () => {},
  };
}
