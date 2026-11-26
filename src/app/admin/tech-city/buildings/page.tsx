"use client";

import React, { useState } from "react";
import { usePortfolioDraft } from "@/lib/cms/context";
import {
  TechCityStudioShell,
  getCityConfig,
  findNodeLayout,
  upsertNodeLayout,
  makeSkillSlugId,
} from "@/components/admin/tech-city/TechCityStudioShell";
import { TextInput } from "@/components/admin/ui/TextInput";

export default function TechCityBuildingsPage() {
  const { draft, saveSkillsAndSync, saveCityConfigAndSync } = usePortfolioDraft();
  const cityConfig = getCityConfig(draft);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [newSkillCat, setNewSkillCat] = useState(draft.skills[0]?.id ?? "");
  const [newSkillName, setNewSkillName] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newSkillName.trim();
    const targetCatId = newSkillCat || draft.skills[0]?.id;
    if (!label || !targetCatId) return;

    const nextSkills = draft.skills.map((cat) => {
      if (cat.id !== targetCatId) return cat;
      if (cat.items.some((s) => s.toLowerCase() === label.toLowerCase())) {
        return cat;
      }
      return { ...cat, items: [...cat.items, label] };
    });
    const res = await saveSkillsAndSync(nextSkills);
    if (res.success) {
      setNewSkillName("");
      notify(`Added "${label}" building tower.`);
    }
  };

  const patchBuildingLayout = async (
    skillId: string,
    patch: {
      stylePreset?: string | null;
      colorOverride?: string | null;
      radius?: number | null;
      isVisible?: boolean;
      positionX?: number | null;
      positionZ?: number | null;
      isLocked?: boolean;
    },
    msg: string,
  ) => {
    const current = findNodeLayout(cityConfig, "skill", skillId);
    const nextConfig = upsertNodeLayout(cityConfig, { ...current, ...patch });
    const res = await saveCityConfigAndSync(nextConfig);
    if (res.success) notify(msg);
  };

  const handleRemoveSkill = async (catId: string, skillName: string) => {
    const nextSkills = draft.skills.map((cat) =>
      cat.id === catId
        ? { ...cat, items: cat.items.filter((i) => i !== skillName) }
        : cat,
    );
    const res = await saveSkillsAndSync(nextSkills);
    if (res.success) notify(`Removed "${skillName}".`);
  };

  const categoriesToRender = draft.skills.filter(
    (cat) => selectedDistrict === "all" || cat.id === selectedDistrict,
  );

  return (
    <TechCityStudioShell
      title="Buildings & Skills"
      description="Each skill is a skyward building inside its district. Customize building tower shapes, accent colors, height scale, or lock custom positions."
      activeHref="/admin/tech-city/buildings/"
      toast={toast}
    >
      {/* Controls & Quick Add */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block font-mono text-micro uppercase text-[var(--color-subtle)] mb-1">
              Filter by District
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-3 py-2 text-small text-[var(--color-text)] outline-none"
            >
              <option value="all">All Districts</option>
              {draft.skills.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block font-mono text-micro uppercase text-[var(--color-subtle)] mb-1">
              Search Buildings
            </label>
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. Python, Docker..."
            />
          </div>
        </div>

        <form
          onSubmit={handleAddBuilding}
          className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-4 flex flex-wrap gap-3 items-end"
        >
          <div className="flex-1 min-w-[150px]">
            <label className="block font-mono text-micro uppercase text-[var(--color-subtle)] mb-1">
              District
            </label>
            <select
              value={newSkillCat}
              onChange={(e) => setNewSkillCat(e.target.value)}
              className="w-full rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-3 py-2 text-small text-[var(--color-text)] outline-none"
            >
              {draft.skills.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block font-mono text-micro uppercase text-[var(--color-subtle)] mb-1">
              New Skill Building
            </label>
            <TextInput
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="Skill name..."
            />
          </div>
          <button
            type="submit"
            className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90"
          >
            + Add Building
          </button>
        </form>
      </div>

      {/* Building rows grouped by district */}
      <div className="space-y-6">
        {categoriesToRender.map((cat) => {
          const items = cat.items.filter((name) =>
            !search.trim()
              ? true
              : name.toLowerCase().includes(search.toLowerCase()),
          );
          if (items.length === 0) return null;

          return (
            <div
              key={cat.id}
              className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-5 space-y-3"
            >
              <h3 className="text-h4 font-medium text-[var(--color-text)]">
                {cat.label} District
              </h3>

              <div className="space-y-2.5">
                {items.map((skillName) => {
                  const skillId = makeSkillSlugId(cat.id, skillName);
                  const layout = findNodeLayout(cityConfig, "skill", skillId);
                  const linkedProjects = draft.projects.filter(
                    (p) =>
                      p.skillIds?.includes(skillId) ||
                      p.tech.some(
                        (t) => t.toLowerCase() === skillName.toLowerCase(),
                      ),
                  ).length;

                  return (
                    <div
                      key={skillId}
                      className="rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] p-3 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="min-w-[170px]">
                        <p className="font-medium text-small text-[var(--color-text)]">
                          {skillName}
                        </p>
                        <p className="font-mono text-micro text-[var(--color-subtle)]">
                          {linkedProjects} connected project
                          {linkedProjects === 1 ? "" : "s"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <select
                          value={layout.stylePreset ?? ""}
                          onChange={(e) =>
                            void patchBuildingLayout(
                              skillId,
                              { stylePreset: e.target.value || null },
                              `Updated building shape for "${skillName}".`,
                            )
                          }
                          aria-label={`Shape for ${skillName}`}
                          className="rounded border border-[var(--hairline)] bg-[var(--color-surface-3)] px-2.5 py-1 text-micro text-[var(--color-text)] outline-none"
                        >
                          <option value="">Shape: District Default</option>
                          <option value="box">Shape: Box Tower</option>
                          <option value="hex">Shape: Hexagonal</option>
                          <option value="prism">Shape: Crystal Prism</option>
                          <option value="spire">Shape: Tech Spire</option>
                        </select>

                        <label className="flex items-center gap-1 text-micro text-[var(--color-muted)]">
                          <span>Height</span>
                          <input
                            type="number"
                            step="0.2"
                            min="0.6"
                            max="3.5"
                            value={layout.radius ?? ""}
                            onChange={(e) =>
                              void patchBuildingLayout(
                                skillId,
                                {
                                  radius:
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                },
                                `Updated height scale for "${skillName}".`,
                              )
                            }
                            placeholder="Auto"
                            className="w-16 rounded border border-[var(--hairline)] bg-[var(--color-surface-3)] px-2 py-1 text-micro text-[var(--color-text)] outline-none"
                          />
                        </label>

                        <input
                          type="color"
                          value={layout.colorOverride ?? "#60a5fa"}
                          onChange={(e) =>
                            void patchBuildingLayout(
                              skillId,
                              { colorOverride: e.target.value },
                              `Updated color for "${skillName}".`,
                            )
                          }
                          title="Building color override"
                          className="size-7 cursor-pointer rounded border border-[var(--hairline)] bg-transparent"
                        />

                        {layout.colorOverride && (
                          <button
                            type="button"
                            onClick={() =>
                              void patchBuildingLayout(
                                skillId,
                                { colorOverride: null },
                                `Reset color for "${skillName}".`,
                              )
                            }
                            className="text-micro text-[var(--color-subtle)] hover:text-[var(--color-text)]"
                          >
                            Auto Color
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            void patchBuildingLayout(
                              skillId,
                              { isVisible: !layout.isVisible },
                              layout.isVisible
                                ? `Hid "${skillName}" from Tech City.`
                                : `Shown "${skillName}" in Tech City.`,
                            )
                          }
                          className={`rounded-full px-2.5 py-0.5 text-micro font-medium ${
                            layout.isVisible
                              ? "bg-[var(--color-live)]/15 text-[var(--color-live)]"
                              : "bg-[var(--color-surface-3)] text-[var(--color-faint)]"
                          }`}
                        >
                          {layout.isVisible ? "Visible" : "Hidden"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleRemoveSkill(cat.id, skillName)}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Remove skill from district"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </TechCityStudioShell>
  );
}
