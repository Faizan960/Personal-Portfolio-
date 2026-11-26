"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePortfolioDraft } from "@/lib/cms/context";
import { getDefaultTechCityAppearance } from "@/lib/cms/storage";
import {
  TechCityStudioShell,
  getCityConfig,
} from "@/components/admin/tech-city/TechCityStudioShell";
import { AdminCard } from "@/components/admin/AdminCard";

const STUDIO_MODULES = [
  {
    title: "Districts",
    href: "/admin/tech-city/districts/",
    description:
      "Create skill districts, assign colors, control visibility, and adjust city ordering.",
  },
  {
    title: "Buildings & Skills",
    href: "/admin/tech-city/buildings/",
    description:
      "Customize building tower shapes, colors, heights, or lock custom district coordinates.",
  },
  {
    title: "Project Landmarks",
    href: "/admin/tech-city/landmarks/",
    description:
      "Control orbital project landmarks, toggle visibility, and position custom landmarks.",
  },
  {
    title: "Technologies",
    href: "/admin/tech-city/technologies/",
    description:
      "Maintain the orbital technology dictionary connected to your projects.",
  },
  {
    title: "Connections",
    href: "/admin/tech-city/connections/",
    description:
      "Inspect automatic relationships and curate custom energy links between districts, skills, and projects.",
  },
  {
    title: "City Appearance",
    href: "/admin/tech-city/appearance/",
    description:
      "Adjust color themes, bloom lighting, fog density, orbit speed, and camera framing.",
  },
];

export default function TechCityOverviewPage() {
  const { draft, saveCityConfigAndSync } = usePortfolioDraft();
  const [toast, setToast] = useState<string | null>(null);
  const cityConfig = getCityConfig(draft);

  const totalBuildings = draft.skills.reduce((acc, s) => acc + s.items.length, 0);
  const activeLandmarks = draft.projects.filter(
    (p) => p.isPublished !== false,
  ).length;
  const lockedPositions = cityConfig.layouts.filter((l) => l.isLocked).length;

  const handleResetAllLayouts = async () => {
    const res = await saveCityConfigAndSync({
      ...cityConfig,
      layouts: [],
    });
    if (res.success) {
      setToast("All custom positions and overrides reset to automatic city layout.");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleResetAppearance = async () => {
    const res = await saveCityConfigAndSync({
      ...cityConfig,
      appearance: getDefaultTechCityAppearance(),
    });
    if (res.success) {
      setToast("City atmosphere reset to recommended settings.");
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <TechCityStudioShell
      title="Tech City Studio"
      description="Design and manage your interactive 3D engineering ecosystem visually. Every change reflects immediately in the preview above."
      activeHref="/admin/tech-city/"
      toast={toast}
      action={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleResetAllLayouts}
            className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-3 py-1.5 text-micro text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
          >
            Reset Positions
          </button>
          <button
            type="button"
            onClick={handleResetAppearance}
            className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-3 py-1.5 text-micro text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
          >
            Reset Appearance
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <AdminCard label="Districts" value={draft.skills.length} />
        <AdminCard label="Buildings" value={totalBuildings} />
        <AdminCard label="Landmarks" value={activeLandmarks} />
        <AdminCard
          label="Technologies"
          value={draft.technologies?.length ?? 0}
        />
        <AdminCard
          label="Custom Links"
          value={cityConfig.customEdges.length}
        />
        <AdminCard label="Locked Coords" value={lockedPositions} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STUDIO_MODULES.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-5 space-y-2 hover:border-[var(--color-accent)]/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-h4 font-medium text-[var(--color-text)]">
                {mod.title}
              </h3>
              <span className="text-micro text-[var(--color-accent)]">Open →</span>
            </div>
            <p className="text-small text-[var(--color-subtle)]">
              {mod.description}
            </p>
          </Link>
        ))}
      </div>
    </TechCityStudioShell>
  );
}
