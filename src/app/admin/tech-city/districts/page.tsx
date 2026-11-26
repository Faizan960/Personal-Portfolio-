"use client";

import React, { useState } from "react";
import { usePortfolioDraft } from "@/lib/cms/context";
import type { MutableSkillCategory } from "@/lib/cms/types";
import {
  TechCityStudioShell,
  getCityConfig,
  findNodeLayout,
  upsertNodeLayout,
} from "@/components/admin/tech-city/TechCityStudioShell";
import { TextInput } from "@/components/admin/ui/TextInput";

export default function TechCityDistrictsPage() {
  const { draft, saveSkillsAndSync, saveCityConfigAndSync } = usePortfolioDraft();
  const cityConfig = getCityConfig(draft);
  const [toast, setToast] = useState<string | null>(null);
  const [newDistrictName, setNewDistrictName] = useState("");
  const [newDistrictCaption, setNewDistrictCaption] = useState("");

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newDistrictName.trim();
    if (!label) return;
    const id = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (draft.skills.some((c) => c.id === id)) return;

    const created: MutableSkillCategory = {
      id,
      label,
      index: String(draft.skills.length + 1).padStart(2, "0"),
      caption: newDistrictCaption.trim(),
      items: [],
      isVisible: true,
    };

    const res = await saveSkillsAndSync([...draft.skills, created]);
    if (res.success) {
      setNewDistrictName("");
      setNewDistrictCaption("");
      notify(`Created district "${label}".`);
    }
  };

  const handleUpdateCategory = async (
    idx: number,
    patch: Partial<MutableSkillCategory>,
    msg?: string,
  ) => {
    const next = [...draft.skills];
    const current = next[idx];
    if (!current) return;
    next[idx] = { ...current, ...patch };
    const res = await saveSkillsAndSync(next);
    if (res.success && msg) notify(msg);
  };

  const handleMoveDistrict = async (idx: number, dir: "up" | "down") => {
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= draft.skills.length) return;
    const next = [...draft.skills];
    const [item] = next.splice(idx, 1);
    if (!item) return;
    next.splice(target, 0, item);
    const res = await saveSkillsAndSync(next);
    if (res.success) notify("District order updated in Tech City.");
  };

  const handleDistrictLayoutPatch = async (
    categoryId: string,
    patch: {
      colorOverride?: string | null;
      isVisible?: boolean;
      positionX?: number | null;
      positionZ?: number | null;
      isLocked?: boolean;
    },
    msg: string,
  ) => {
    const current = findNodeLayout(cityConfig, "category", categoryId);
    const nextConfig = upsertNodeLayout(cityConfig, { ...current, ...patch });
    const res = await saveCityConfigAndSync(nextConfig);
    if (res.success) notify(msg);
  };

  return (
    <TechCityStudioShell
      title="Tech City Districts"
      description="Each Skill Category renders as an illuminated city district. Adjust district names, accent colors, ordering, and visibility."
      activeHref="/admin/tech-city/districts/"
      toast={toast}
    >
      {/* Create District */}
      <form
        onSubmit={handleAddDistrict}
        className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-4 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[180px]">
          <label className="block font-mono text-micro uppercase text-[var(--color-subtle)] mb-1">
            New District Name
          </label>
          <TextInput
            value={newDistrictName}
            onChange={(e) => setNewDistrictName(e.target.value)}
            placeholder="e.g. Cloud & DevOps"
          />
        </div>
        <div className="flex-[2] min-w-[220px]">
          <label className="block font-mono text-micro uppercase text-[var(--color-subtle)] mb-1">
            District Description
          </label>
          <TextInput
            value={newDistrictCaption}
            onChange={(e) => setNewDistrictCaption(e.target.value)}
            placeholder="Factual framing shown on Skills & City panel..."
          />
        </div>
        <button
          type="submit"
          className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90"
        >
          + Add District
        </button>
      </form>

      {/* Districts list */}
      <div className="space-y-4">
        {draft.skills.map((cat, idx) => {
          const layout = findNodeLayout(cityConfig, "category", cat.id);
          const visible = layout.isVisible && cat.isVisible !== false;
          return (
            <div
              key={cat.id}
              className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                  <span className="font-mono text-micro text-[var(--color-accent-warm)]">
                    {cat.index}
                  </span>
                  <TextInput
                    value={cat.label}
                    onChange={(e) =>
                      void handleUpdateCategory(idx, { label: e.target.value })
                    }
                    className="max-w-xs"
                  />
                  <span className="font-mono text-micro text-[var(--color-subtle)]">
                    {cat.items.length} building{cat.items.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-micro text-[var(--color-muted)]">
                    <span>District Accent</span>
                    <input
                      type="color"
                      value={layout.colorOverride ?? "#38bdf8"}
                      onChange={(e) =>
                        void handleDistrictLayoutPatch(
                          cat.id,
                          { colorOverride: e.target.value },
                          `Updated accent color for "${cat.label}".`,
                        )
                      }
                      className="size-7 cursor-pointer rounded border border-[var(--hairline)] bg-transparent"
                    />
                  </label>

                  {layout.colorOverride && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleDistrictLayoutPatch(
                          cat.id,
                          { colorOverride: null },
                          `Cleared custom color for "${cat.label}".`,
                        )
                      }
                      className="rounded border border-[var(--hairline)] px-2 py-1 text-micro text-[var(--color-subtle)]"
                    >
                      Auto Color
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      void handleDistrictLayoutPatch(
                        cat.id,
                        { isVisible: !visible },
                        visible
                          ? `Hid "${cat.label}" from Tech City.`
                          : `Shown "${cat.label}" in Tech City.`,
                      )
                    }
                    className={`rounded-full px-3 py-1 text-micro font-medium ${
                      visible
                        ? "bg-[var(--color-live)]/15 text-[var(--color-live)]"
                        : "bg-[var(--color-surface-3)] text-[var(--color-faint)]"
                    }`}
                  >
                    {visible ? "Visible in City" : "Hidden in City"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleMoveDistrict(idx, "up")}
                    disabled={idx === 0}
                    className="rounded border border-[var(--hairline)] px-2 py-1 text-micro text-[var(--color-muted)] disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleMoveDistrict(idx, "down")}
                    disabled={idx === draft.skills.length - 1}
                    className="rounded border border-[var(--hairline)] px-2 py-1 text-micro text-[var(--color-muted)] disabled:opacity-25"
                  >
                    ↓
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <TextInput
                    value={cat.caption}
                    onChange={(e) =>
                      void handleUpdateCategory(idx, { caption: e.target.value })
                    }
                    placeholder="District description..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={layout.positionX ?? ""}
                    onChange={(e) =>
                      void handleDistrictLayoutPatch(
                        cat.id,
                        {
                          positionX:
                            e.target.value === "" ? null : Number(e.target.value),
                          isLocked: true,
                        },
                        `Updated position for "${cat.label}".`,
                      )
                    }
                    placeholder="X coord (auto)"
                    className="w-full rounded bg-[var(--color-surface-2)] border border-[var(--hairline)] px-2.5 py-1.5 text-micro text-[var(--color-text)] outline-none"
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={layout.positionZ ?? ""}
                    onChange={(e) =>
                      void handleDistrictLayoutPatch(
                        cat.id,
                        {
                          positionZ:
                            e.target.value === "" ? null : Number(e.target.value),
                          isLocked: true,
                        },
                        `Updated position for "${cat.label}".`,
                      )
                    }
                    placeholder="Z coord (auto)"
                    className="w-full rounded bg-[var(--color-surface-2)] border border-[var(--hairline)] px-2.5 py-1.5 text-micro text-[var(--color-text)] outline-none"
                  />
                  {layout.isLocked && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleDistrictLayoutPatch(
                          cat.id,
                          { positionX: null, positionZ: null, isLocked: false },
                          `Unlocked automatic coordinates for "${cat.label}".`,
                        )
                      }
                      className="rounded border border-[var(--hairline)] px-2 py-1 text-micro text-[var(--color-subtle)] shrink-0"
                    >
                      Auto
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
