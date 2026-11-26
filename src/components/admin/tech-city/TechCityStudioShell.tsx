"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import { getDefaultTechCityConfig } from "@/lib/cms/storage";
import type {
  CityEntityKind,
  PortfolioDraft,
  TechCityConfig,
  TechCityNodeLayout,
} from "@/lib/cms/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/ui/SaveIndicator";

const TechCityPreviewCanvas = dynamic(
  () => import("@/components/city/TechCity").then((m) => m.TechCity),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[380px] items-center justify-center rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--color-surface-1)] font-mono text-micro text-[var(--color-subtle)]">
        Initializing Live 3D Tech City Preview...
      </div>
    ),
  },
);

export function getCityConfig(draft: PortfolioDraft): TechCityConfig {
  return draft.cityConfig ?? getDefaultTechCityConfig();
}

export function findNodeLayout(
  config: TechCityConfig,
  entityType: CityEntityKind,
  entityId: string,
): TechCityNodeLayout {
  return (
    config.layouts.find(
      (l) => l.entityType === entityType && l.entityId === entityId,
    ) ?? {
      entityType,
      entityId,
      positionX: null,
      positionY: null,
      positionZ: null,
      radius: null,
      colorOverride: null,
      stylePreset: null,
      isLocked: false,
      sortOrder: null,
      isVisible: true,
    }
  );
}

export function upsertNodeLayout(
  config: TechCityConfig,
  nextLayout: TechCityNodeLayout,
): TechCityConfig {
  const exists = config.layouts.some(
    (l) =>
      l.entityType === nextLayout.entityType &&
      l.entityId === nextLayout.entityId,
  );
  const layouts = exists
    ? config.layouts.map((l) =>
        l.entityType === nextLayout.entityType &&
        l.entityId === nextLayout.entityId
          ? nextLayout
          : l,
      )
    : [...config.layouts, nextLayout];
  return { ...config, layouts };
}

export function makeSkillSlugId(categoryId: string, skillName: string): string {
  const slug = skillName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${categoryId}:${slug}`;
}

export function resolveEntityDisplayName(
  draft: PortfolioDraft,
  entityType: CityEntityKind,
  entityId: string,
): string {
  if (entityType === "core") {
    return draft.cityConfig?.appearance.coreLabel || draft.personal.name;
  }
  if (entityType === "category") {
    return draft.skills.find((c) => c.id === entityId)?.label ?? entityId;
  }
  if (entityType === "project") {
    return draft.projects.find((p) => p.id === entityId)?.name ?? entityId;
  }
  if (entityType === "technology") {
    return draft.technologies?.find((t) => t.id === entityId)?.name ?? entityId;
  }
  if (entityType === "skill") {
    for (const cat of draft.skills) {
      for (const item of cat.items) {
        if (makeSkillSlugId(cat.id, item) === entityId) {
          return `${item} (${cat.label})`;
        }
      }
    }
  }
  return entityId;
}

const CITY_TABS = [
  { label: "City Overview", href: "/admin/tech-city/" },
  { label: "Districts", href: "/admin/tech-city/districts/" },
  { label: "Buildings & Skills", href: "/admin/tech-city/buildings/" },
  { label: "Project Landmarks", href: "/admin/tech-city/landmarks/" },
  { label: "Technologies", href: "/admin/tech-city/technologies/" },
  { label: "Connections", href: "/admin/tech-city/connections/" },
  { label: "City Appearance", href: "/admin/tech-city/appearance/" },
];

export function TechCityStudioShell({
  title,
  description,
  activeHref,
  toast,
  action,
  showPreview = true,
  children,
}: {
  title: string;
  description: string;
  activeHref: string;
  toast?: string | null;
  action?: React.ReactNode;
  showPreview?: boolean;
  children: React.ReactNode;
}) {
  const { draft, isSaving, lastSaved, syncError } = usePortfolioDraft();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title={title}
        description={description}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
            {action}
          </div>
        }
      />

      {/* Sub-navigation bar */}
      <nav
        aria-label="Tech City Studio sections"
        className="flex flex-wrap gap-2 border-b border-[var(--hairline)] pb-3"
      >
        {CITY_TABS.map((tab) => {
          const isActive = activeHref === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-full px-3.5 py-1.5 text-micro font-medium transition-colors ${
                isActive
                  ? "bg-[var(--color-accent)] text-[var(--color-void)]"
                  : "border border-[var(--hairline)] bg-[var(--color-surface-1)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {toast && (
        <div
          role="status"
          className="rounded-[var(--radius-panel)] border border-[var(--color-live)]/30 bg-[var(--color-live)]/10 px-4 py-2.5 text-small text-[var(--color-live)]"
        >
          ✓ {toast}
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

      {showPreview && (
        <div className="rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--color-surface-1)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--hairline-faint)] px-4 py-2.5">
            <span className="font-mono text-micro uppercase tracking-[0.14em] text-[var(--color-subtle)]">
              Live Interactive 3D City Preview (Working Workspace)
            </span>
            <Link
              href="/admin/publishing/"
              className="text-micro text-[var(--color-accent)] hover:underline"
            >
              Publish changes when ready →
            </Link>
          </div>
          <div className="h-[380px] relative">
            <TechCityPreviewCanvas
              draftOverride={draft}
              embeddedPreview
              includeUnpublished
            />
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
