"use client";

import React, { useState } from "react";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import type { MutableSkillCategory } from "@/lib/cms/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/ui/SaveIndicator";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { TagInput } from "@/components/admin/ui/TagInput";

export default function SkillsCMSPage() {
  const { draft, saveSkillsAndSync, isSaving, lastSaved, syncError } =
    usePortfolioDraft();
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCat, setNewCat] = useState({ id: "", label: "", index: "", caption: "" });
  const [toast, setToast] = useState<string | null>(null);

  const commitSkills = async (nextCategories: MutableSkillCategory[], note?: string) => {
    const res = await saveSkillsAndSync(nextCategories);
    if (res.success && note) {
      setToast(note);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleUpdateCategory = (
    index: number,
    field: keyof MutableSkillCategory,
    val: unknown
  ) => {
    const copy = [...draft.skills];
    const target = copy[index];
    if (target) {
      copy[index] = { ...target, [field]: val };
    }
    void commitSkills(copy);
  };

  const handleMoveCategory = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= draft.skills.length) return;

    const copy = [...draft.skills];
    const [item] = copy.splice(index, 1);
    if (item !== undefined) {
      copy.splice(targetIdx, 0, item);
    }
    void commitSkills(copy, "Category order saved.");
  };

  const handleDeleteCategoryConfirm = () => {
    if (!deleteCatId) return;
    void commitSkills(
      draft.skills.filter((c) => c.id !== deleteCatId),
      "Skill category removed.",
    );
    setDeleteCatId(null);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.label.trim() || !newCat.id.trim()) return;

    const category: MutableSkillCategory = {
      id: newCat.id.trim().toLowerCase(),
      label: newCat.label.trim(),
      index: newCat.index.trim() || String(draft.skills.length + 1).padStart(2, "0"),
      caption: newCat.caption.trim(),
      items: [],
      isVisible: true,
    };

    void commitSkills([...draft.skills, category], `Added category "${category.label}".`);

    setNewCat({ id: "", label: "", index: "", caption: "" });
    setIsAddingCategory(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Skills Taxonomy"
        description="Organize skills into categories. Duplicate skill tags across categories (e.g. Git) are supported."
        action={
          <div className="flex items-center gap-3">
            <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
            <button
              type="button"
              onClick={() => setIsAddingCategory(true)}
              className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90 transition-opacity"
            >
              + Add Category
            </button>
          </div>
        }
      />

      {toast && (
        <div className="rounded-[var(--radius-panel)] border border-[var(--color-live)]/30 bg-[var(--color-live)]/10 px-4 py-2.5 text-small text-[var(--color-live)]">
          ✓ {toast}
        </div>
      )}

      {syncError && (
        <div className="rounded-[var(--radius-panel)] border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-small text-red-200">
          {syncError}
        </div>
      )}

      {/* Add Category Form Modal / Drawer */}
      {isAddingCategory && (
        <form
          onSubmit={handleAddCategorySubmit}
          className="rounded-[var(--radius-panel)] border border-[var(--color-accent)]/40 bg-[var(--color-surface-2)] p-5 space-y-4"
        >
          <h3 className="text-h4 font-medium text-[var(--color-text)]">
            Create Skill Category
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-micro font-mono uppercase text-[var(--color-subtle)] mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={newCat.label}
                onChange={(e) => {
                  const lbl = e.target.value;
                  setNewCat((prev) => ({
                    ...prev,
                    label: lbl,
                    id: prev.id || lbl.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                  }));
                }}
                placeholder="e.g. Databases & Storage"
                className="w-full rounded bg-[var(--color-surface-3)] px-3 py-1.5 text-small text-[var(--color-text)] outline-none"
              />
            </div>

            <div>
              <label className="block text-micro font-mono uppercase text-[var(--color-subtle)] mb-1">
                Category ID (Slug) *
              </label>
              <input
                type="text"
                required
                value={newCat.id}
                onChange={(e) => setNewCat({ ...newCat, id: e.target.value })}
                placeholder="databases"
                className="w-full rounded bg-[var(--color-surface-3)] px-3 py-1.5 text-small text-[var(--color-text)] outline-none"
              />
            </div>

            <div>
              <label className="block text-micro font-mono uppercase text-[var(--color-subtle)] mb-1">
                Index (Ordinal)
              </label>
              <input
                type="text"
                value={newCat.index}
                onChange={(e) => setNewCat({ ...newCat, index: e.target.value })}
                placeholder="06"
                className="w-full rounded bg-[var(--color-surface-3)] px-3 py-1.5 text-small text-[var(--color-text)] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-micro font-mono uppercase text-[var(--color-subtle)] mb-1">
              Caption
            </label>
            <input
              type="text"
              value={newCat.caption}
              onChange={(e) => setNewCat({ ...newCat, caption: e.target.value })}
              placeholder="Short framing describing exposure and practice..."
              className="w-full rounded bg-[var(--color-surface-3)] px-3 py-1.5 text-small text-[var(--color-text)] outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingCategory(false)}
              className="rounded px-3 py-1.5 text-small text-[var(--color-muted)] hover:bg-[var(--color-surface-3)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-[var(--color-accent)] px-4 py-1.5 text-small font-medium text-[var(--color-void)] hover:opacity-90"
            >
              Add Category
            </button>
          </div>
        </form>
      )}

      {/* Categories List */}
      <div className="space-y-6">
        {draft.skills.map((category, catIdx) => (
          <div
            key={category.id}
            className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-5 space-y-4"
          >
            {/* Category Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline-faint)] pb-3">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <input
                  type="text"
                  value={category.index}
                  onChange={(e) => handleUpdateCategory(catIdx, "index", e.target.value)}
                  className="w-12 text-center rounded bg-[var(--color-surface-2)] border border-[var(--hairline)] py-1 font-mono text-micro text-[var(--color-accent-warm)] outline-none"
                  title="Ordinal index"
                />
                <input
                  type="text"
                  value={category.label}
                  onChange={(e) => handleUpdateCategory(catIdx, "label", e.target.value)}
                  className="rounded bg-[var(--color-surface-2)] border border-[var(--hairline)] px-2.5 py-1 text-h4 font-medium text-[var(--color-text)] outline-none flex-1 max-w-sm"
                  title="Category label"
                />
                <span className="font-mono text-micro text-[var(--color-faint)]">
                  id: {category.id}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleMoveCategory(catIdx, "up")}
                  disabled={catIdx === 0}
                  className="p-1.5 text-small text-[var(--color-subtle)] hover:text-[var(--color-text)] disabled:opacity-20"
                  title="Move category up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveCategory(catIdx, "down")}
                  disabled={catIdx === draft.skills.length - 1}
                  className="p-1.5 text-small text-[var(--color-subtle)] hover:text-[var(--color-text)] disabled:opacity-20"
                  title="Move category down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteCatId(category.id)}
                  className="rounded p-1.5 text-small text-red-400 hover:text-red-300"
                  title="Delete category"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Caption */}
            <div>
              <label className="block text-micro font-mono uppercase text-[var(--color-subtle)] mb-1">
                Category Caption
              </label>
              <input
                type="text"
                value={category.caption}
                onChange={(e) => handleUpdateCategory(catIdx, "caption", e.target.value)}
                placeholder="Factual framing of exposure and practice..."
                className="w-full rounded bg-[var(--color-surface-2)] border border-[var(--hairline)] px-3 py-1.5 text-small text-[var(--color-muted)] outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            {/* Skill Items (TagInput) */}
            <div>
              <label className="block text-micro font-mono uppercase text-[var(--color-subtle)] mb-1">
                Skill Items ({category.items.length})
              </label>
              <TagInput
                tags={category.items}
                onChange={(items) => handleUpdateCategory(catIdx, "items", items)}
                placeholder="Type skill name and press Enter..."
              />
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteCatId !== null}
        title="Delete Skill Category"
        description="Are you sure you want to delete this category and all skills contained in it? This modifies your local draft."
        confirmLabel="Delete Category"
        variant="danger"
        onConfirm={handleDeleteCategoryConfirm}
        onCancel={() => setDeleteCatId(null)}
      />
    </div>
  );
}
