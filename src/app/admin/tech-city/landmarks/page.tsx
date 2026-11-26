"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePortfolioDraft } from "@/lib/cms/context";
import type { MutableProject } from "@/lib/cms/types";
import {
  TechCityStudioShell,
  getCityConfig,
  findNodeLayout,
  upsertNodeLayout,
} from "@/components/admin/tech-city/TechCityStudioShell";

export default function TechCityLandmarksPage() {
  const { draft, saveProjectAndSync, saveCityConfigAndSync } =
    usePortfolioDraft();
  const cityConfig = getCityConfig(draft);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const patchLandmarkLayout = async (
    projectId: string,
    patch: {
      stylePreset?: string | null;
      colorOverride?: string | null;
      radius?: number | null;
      positionX?: number | null;
      positionY?: number | null;
      positionZ?: number | null;
      isLocked?: boolean;
      isVisible?: boolean;
    },
    msg: string,
  ) => {
    const current = findNodeLayout(cityConfig, "project", projectId);
    const nextConfig = upsertNodeLayout(cityConfig, { ...current, ...patch });
    const res = await saveCityConfigAndSync(nextConfig);
    if (res.success) notify(msg);
  };

  const toggleProjectPublished = async (project: MutableProject, idx: number) => {
    const res = await saveProjectAndSync(
      { ...project, isPublished: project.isPublished === false },
      idx,
    );
    if (res.success) {
      notify(
        project.isPublished === false
          ? `"${project.name}" enabled for live portfolio & Tech City.`
          : `"${project.name}" set to hidden draft.`,
      );
    }
  };

  return (
    <TechCityStudioShell
      title="Project Landmarks"
      description="Control how your projects orbit above Tech City as luminous landmarks. Position, scale, color, and visibility changes apply without affecting GitHub repository transparency."
      activeHref="/admin/tech-city/landmarks/"
      toast={toast}
    >
      <div className="space-y-4">
        {draft.projects.map((project, idx) => {
          const layout = findNodeLayout(cityConfig, "project", project.id);
          const isPublished = project.isPublished !== false;
          const visibleInCity = layout.isVisible && isPublished;

          return (
            <div
              key={project.id}
              className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-micro text-[var(--color-accent-warm)]">
                      {project.index}
                    </span>
                    <h3 className="text-h4 font-medium text-[var(--color-text)]">
                      {project.name}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-micro ${
                        visibleInCity
                          ? "bg-[var(--color-live)]/15 text-[var(--color-live)]"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {visibleInCity ? "Visible Landmark" : "Hidden"}
                    </span>
                  </div>
                  <p className="text-micro text-[var(--color-subtle)] mt-1">
                    {project.category} · {project.tech.length} tech item
                    {project.tech.length === 1 ? "" : "s"} ·{" "}
                    {(project.skillIds ?? []).length} linked skill
                    {(project.skillIds ?? []).length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleProjectPublished(project, idx)}
                    className={`rounded-full px-3 py-1 text-micro font-medium ${
                      isPublished
                        ? "bg-[var(--color-live)]/15 text-[var(--color-live)]"
                        : "bg-[var(--color-surface-3)] text-[var(--color-faint)]"
                    }`}
                  >
                    {isPublished ? "Website: Live Eligible" : "Website: Hidden"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void patchLandmarkLayout(
                        project.id,
                        { isVisible: !layout.isVisible },
                        layout.isVisible
                          ? `Hidden "${project.name}" landmark in Tech City.`
                          : `Shown "${project.name}" landmark in Tech City.`,
                      )
                    }
                    className="rounded border border-[var(--hairline)] px-3 py-1 text-micro text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
                  >
                    {layout.isVisible ? "Hide in City" : "Show in City"}
                  </button>

                  <Link
                    href={`/admin/projects/edit/?id=${encodeURIComponent(project.id)}`}
                    className="rounded bg-[var(--color-surface-2)] px-3 py-1 text-micro font-medium text-[var(--color-accent)] hover:bg-[var(--color-surface-3)]"
                  >
                    Edit Links &amp; Details →
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <label className="space-y-1 text-micro text-[var(--color-subtle)]">
                  <span>Beacon Shape</span>
                  <select
                    value={layout.stylePreset ?? ""}
                    onChange={(e) =>
                      void patchLandmarkLayout(
                        project.id,
                        { stylePreset: e.target.value || null },
                        `Updated landmark shape for "${project.name}".`,
                      )
                    }
                    className="w-full rounded border border-[var(--hairline)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-micro text-[var(--color-text)] outline-none"
                  >
                    <option value="">Default Beacon</option>
                    <option value="prism">Orbital Prism</option>
                    <option value="spire">Signal Spire</option>
                    <option value="hex">Hex Citadel</option>
                  </select>
                </label>

                <label className="space-y-1 text-micro text-[var(--color-subtle)]">
                  <span>Size Scale</span>
                  <input
                    type="number"
                    step="0.2"
                    min="0.6"
                    max="3"
                    value={layout.radius ?? ""}
                    onChange={(e) =>
                      void patchLandmarkLayout(
                        project.id,
                        {
                          radius:
                            e.target.value === "" ? null : Number(e.target.value),
                        },
                        `Updated landmark scale for "${project.name}".`,
                      )
                    }
                    placeholder="Auto"
                    className="w-full rounded border border-[var(--hairline)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-micro text-[var(--color-text)] outline-none"
                  />
                </label>

                <label className="space-y-1 text-micro text-[var(--color-subtle)]">
                  <span>X Coord</span>
                  <input
                    type="number"
                    step="0.5"
                    value={layout.positionX ?? ""}
                    onChange={(e) =>
                      void patchLandmarkLayout(
                        project.id,
                        {
                          positionX:
                            e.target.value === "" ? null : Number(e.target.value),
                          isLocked: true,
                        },
                        `Updated position for "${project.name}".`,
                      )
                    }
                    placeholder="Auto"
                    className="w-full rounded border border-[var(--hairline)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-micro text-[var(--color-text)] outline-none"
                  />
                </label>

                <label className="space-y-1 text-micro text-[var(--color-subtle)]">
                  <span>Elevation (Y)</span>
                  <input
                    type="number"
                    step="0.5"
                    value={layout.positionY ?? ""}
                    onChange={(e) =>
                      void patchLandmarkLayout(
                        project.id,
                        {
                          positionY:
                            e.target.value === "" ? null : Number(e.target.value),
                          isLocked: true,
                        },
                        `Updated elevation for "${project.name}".`,
                      )
                    }
                    placeholder="Auto"
                    className="w-full rounded border border-[var(--hairline)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-micro text-[var(--color-text)] outline-none"
                  />
                </label>

                <label className="space-y-1 text-micro text-[var(--color-subtle)]">
                  <span>Z Coord</span>
                  <input
                    type="number"
                    step="0.5"
                    value={layout.positionZ ?? ""}
                    onChange={(e) =>
                      void patchLandmarkLayout(
                        project.id,
                        {
                          positionZ:
                            e.target.value === "" ? null : Number(e.target.value),
                          isLocked: true,
                        },
                        `Updated depth position for "${project.name}".`,
                      )
                    }
                    placeholder="Auto"
                    className="w-full rounded border border-[var(--hairline)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-micro text-[var(--color-text)] outline-none"
                  />
                </label>

                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-1.5 text-micro text-[var(--color-muted)] pb-1">
                    <input
                      type="color"
                      value={layout.colorOverride ?? "#f59e0b"}
                      onChange={(e) =>
                        void patchLandmarkLayout(
                          project.id,
                          { colorOverride: e.target.value },
                          `Updated accent for "${project.name}".`,
                        )
                      }
                      className="size-7 cursor-pointer rounded border border-[var(--hairline)] bg-transparent"
                    />
                  </label>
                  {layout.isLocked && (
                    <button
                      type="button"
                      onClick={() =>
                        void patchLandmarkLayout(
                          project.id,
                          {
                            positionX: null,
                            positionY: null,
                            positionZ: null,
                            isLocked: false,
                          },
                          `Reset "${project.name}" to automatic orbit.`,
                        )
                      }
                      className="rounded border border-[var(--hairline)] px-2.5 py-1.5 text-micro text-[var(--color-subtle)] hover:text-[var(--color-text)]"
                    >
                      Auto Orbit
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </TechCityStudioShell>
  );
}
