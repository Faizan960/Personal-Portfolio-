"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import {
  PublicPortfolioProvider,
  usePublicPortfolio,
} from "@/lib/portfolio/publicContext";

export interface PublicChromeProps {
  children: ReactNode;
}

function PreviewStatusBanner() {
  const { isPreviewMode, previewDenied } = usePublicPortfolio();

  if (isPreviewMode) {
    return (
      <div
        role="status"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[120] rounded-full border border-amber-400/40 bg-[#121622]/95 px-4 py-2 text-center text-micro text-amber-200 shadow-lg backdrop-blur-md whitespace-nowrap"
      >
        <span>Previewing unpublished CMS workspace changes · </span>
        <Link
          href="/admin/publishing/"
          className="font-semibold text-amber-300 underline hover:text-amber-100"
        >
          Open Publishing Center
        </Link>
      </div>
    );
  }

  if (previewDenied) {
    return (
      <div
        role="status"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[120] rounded-full border border-[var(--hairline)] bg-[var(--color-surface-1)]/95 px-4 py-2 text-center text-micro text-[var(--color-muted)] shadow-lg backdrop-blur-md whitespace-nowrap"
      >
        Admin sign-in is required to preview unpublished changes. Showing live published website.
      </div>
    );
  }

  return null;
}

export function PublicChrome({ children }: PublicChromeProps) {
  const pathname = usePathname();

  if (pathname && pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <PublicPortfolioProvider>
      <PreviewStatusBanner />
      <AmbientBackground />
      <Navigation />

      <main id="main" className="relative" style={{ zIndex: "var(--z-content)" }}>
        {children}
      </main>

      <div className="relative" style={{ zIndex: "var(--z-content)" }}>
        <Footer />
      </div>
    </PublicPortfolioProvider>
  );
}
