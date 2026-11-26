"use client";

import React, { useState } from "react";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import type { MutableAchievement } from "@/lib/cms/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormField } from "@/components/admin/ui/FormField";
import { TextInput } from "@/components/admin/ui/TextInput";
import { TextArea } from "@/components/admin/ui/TextArea";
import { SaveIndicator } from "@/components/admin/ui/SaveIndicator";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";

export default function AchievementsCMSPage() {
  const { draft, saveAchievementsAndSync, isSaving, lastSaved, syncError } =
    usePortfolioDraft();
  const [editingItem, setEditingItem] = useState<MutableAchievement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MutableAchievement | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const commitAchievements = async (next: MutableAchievement[], msg: string) => {
    const res = await saveAchievementsAndSync(next);
    if (res.success) {
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleStartNew = () => {
    setEditingItem({
      id: `achieve-${Date.now().toString().slice(-4)}`,
      name: "",
      result: null,
      context: null,
      date: null,
      isVisible: true,
    });
  };

  const handleSaveItem = async (itemToSave: MutableAchievement) => {
    if (!itemToSave.name.trim()) return;

    const copy = [...draft.achievements];
    const existingIdx = copy.findIndex((a) => a.id === itemToSave.id);
    if (existingIdx !== -1) {
      copy[existingIdx] = itemToSave;
    } else {
      copy.push(itemToSave);
    }
    await commitAchievements(copy, `Saved achievement "${itemToSave.name}".`);
    setEditingItem(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await commitAchievements(
      draft.achievements.filter((a) => a.id !== deleteTarget.id),
      `Deleted "${deleteTarget.name}".`,
    );
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Achievements"
        description="Manage competition results and hackathon placements. Preserves accurate results and contexts."
        action={
          <div className="flex items-center gap-3">
            <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
            <button
              type="button"
              onClick={handleStartNew}
              className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90 transition-opacity"
            >
              + Add Achievement
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

      {/* Editor Modal / Drawer */}
      {editingItem && (
        <div className="rounded-[var(--radius-panel)] border border-[var(--color-accent)]/40 bg-[var(--color-surface-2)] p-6 space-y-4">
          <h3 className="text-h4 font-medium text-[var(--color-text)]">
            {draft.achievements.some((a) => a.id === editingItem.id)
              ? `Edit Achievement: ${editingItem.name}`
              : "New Achievement"}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Achievement Name" required>
              <TextInput
                value={editingItem.name}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, name: e.target.value })
                }
                placeholder="e.g. SIH Internal Hackathon Winner"
              />
            </FormField>

            <FormField label="Unique ID" required>
              <TextInput
                value={editingItem.id}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, id: e.target.value })
                }
                placeholder="e.g. sih-internal-hackathon"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Result / Placement"
              helperText="e.g. '4th Place' or null if not applicable."
            >
              <TextInput
                value={editingItem.result ?? ""}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    result: e.target.value.trim() ? e.target.value : null,
                  })
                }
                placeholder="e.g. 4th Place or null"
              />
            </FormField>

            <FormField label="Date" helperText="Date of achievement. Null if unstated.">
              <TextInput
                value={editingItem.date ?? ""}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    date: e.target.value.trim() ? e.target.value : null,
                  })
                }
                placeholder="e.g. 2023 or null"
              />
            </FormField>
          </div>

          <FormField
            label="Context Framing"
            helperText="Neutral framing of what the achievement was."
          >
            <TextArea
              value={editingItem.context ?? ""}
              onChange={(e) =>
                setEditingItem({
                  ...editingItem,
                  context: e.target.value.trim() ? e.target.value : null,
                })
              }
              rows={2}
              placeholder="e.g. Smart India Hackathon — internal round"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--hairline-faint)]">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="rounded px-4 py-2 text-small text-[var(--color-muted)] hover:bg-[var(--color-surface-3)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveItem(editingItem)}
              className="rounded bg-[var(--color-accent)] px-5 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90"
            >
              Save Achievement
            </button>
          </div>
        </div>
      )}

      {/* Achievements List */}
      <div className="space-y-4">
        {draft.achievements.map((item) => (
          <div
            key={item.id}
            className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-5 space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-h4 font-medium text-[var(--color-text)]">
                    {item.name}
                  </span>
                  {item.result && (
                    <span className="rounded bg-[var(--color-accent-warm)]/15 px-2 py-0.5 font-mono text-micro text-[var(--color-accent-warm)]">
                      {item.result}
                    </span>
                  )}
                </div>
                <p className="text-small text-[var(--color-muted)] mt-1">
                  {item.context ?? "No context stated"}
                </p>
                {item.date && (
                  <p className="font-mono text-micro text-[var(--color-faint)] mt-1">
                    Date: {item.date}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingItem(JSON.parse(JSON.stringify(item)))}
                  className="rounded bg-[var(--color-surface-2)] px-2.5 py-1 text-micro text-[var(--color-text)] hover:bg-[var(--color-surface-3)]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(item)}
                  className="p-1 text-red-400 hover:text-red-300"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Achievement"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete Achievement"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
