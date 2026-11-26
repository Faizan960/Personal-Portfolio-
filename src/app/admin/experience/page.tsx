"use client";

import React, { useState } from "react";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import type { MutableExperienceItem } from "@/lib/cms/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormField } from "@/components/admin/ui/FormField";
import { TextInput } from "@/components/admin/ui/TextInput";
import { TextArea } from "@/components/admin/ui/TextArea";
import { ToggleField } from "@/components/admin/ui/ToggleField";
import { TagInput } from "@/components/admin/ui/TagInput";
import { ArrayEditor } from "@/components/admin/ui/ArrayEditor";
import { SaveIndicator } from "@/components/admin/ui/SaveIndicator";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";

export default function ExperienceCMSPage() {
  const { draft, saveExperienceAndSync, isSaving, lastSaved, syncError } =
    usePortfolioDraft();
  const [editingItem, setEditingItem] = useState<MutableExperienceItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MutableExperienceItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const commitExperience = async (next: MutableExperienceItem[], msg: string) => {
    const res = await saveExperienceAndSync(next);
    if (res.success) {
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleStartNew = () => {
    setEditingItem({
      id: `role-${Date.now().toString().slice(-4)}`,
      role: "",
      organisation: "",
      period: "",
      location: "Mumbai, India",
      duration: null,
      current: false,
      summary: "",
      highlights: [],
      tech: [],
      isVisible: true,
    });
  };

  const handleSaveItem = async (itemToSave: MutableExperienceItem) => {
    if (!itemToSave.role.trim() || !itemToSave.organisation.trim()) return;

    const copy = [...draft.experience];
    const existingIdx = copy.findIndex((e) => e.id === itemToSave.id);
    if (existingIdx !== -1) {
      copy[existingIdx] = itemToSave;
    } else {
      copy.push(itemToSave);
    }
    await commitExperience(copy, `Saved role "${itemToSave.role}".`);
    setEditingItem(null);
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= draft.experience.length) return;

    const copy = [...draft.experience];
    const [item] = copy.splice(index, 1);
    if (item !== undefined) {
      copy.splice(targetIdx, 0, item);
    }
    await commitExperience(copy, "Experience order saved.");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await commitExperience(
      draft.experience.filter((e) => e.id !== deleteTarget.id),
      `Deleted "${deleteTarget.role}".`,
    );
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Experience"
        description="Manage professional roles, internships and engagements in ascending chronological order."
        action={
          <div className="flex items-center gap-3">
            <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
            <button
              type="button"
              onClick={handleStartNew}
              className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90 transition-opacity"
            >
              + Add Role
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
            {draft.experience.some((e) => e.id === editingItem.id)
              ? `Edit Role: ${editingItem.role} @ ${editingItem.organisation}`
              : "New Experience Item"}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Role / Title" required>
              <TextInput
                value={editingItem.role}
                onChange={(e) => setEditingItem({ ...editingItem, role: e.target.value })}
                placeholder="e.g. Web Developer Intern"
              />
            </FormField>

            <FormField label="Organisation" required>
              <TextInput
                value={editingItem.organisation}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, organisation: e.target.value })
                }
                placeholder="e.g. InAmigos Foundation"
              />
            </FormField>

            <FormField label="Unique ID" required>
              <TextInput
                value={editingItem.id}
                onChange={(e) => setEditingItem({ ...editingItem, id: e.target.value })}
                placeholder="e.g. inamigos-web-dev-intern"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Period" required helperText="e.g. August 2026 — Present">
              <TextInput
                value={editingItem.period}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, period: e.target.value })
                }
              />
            </FormField>

            <FormField label="Location">
              <TextInput
                value={editingItem.location}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, location: e.target.value })
                }
              />
            </FormField>

            <FormField label="Duration (Optional)">
              <TextInput
                value={editingItem.duration ?? ""}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    duration: e.target.value || null,
                  })
                }
                placeholder="e.g. 3 months or null"
              />
            </FormField>
          </div>

          <ToggleField
            label="Current Role"
            description="Renders a live indicator and marks the role as ongoing."
            checked={editingItem.current}
            onChange={(checked) => setEditingItem({ ...editingItem, current: checked })}
          />

          <FormField label="Summary" required>
            <TextArea
              value={editingItem.summary}
              onChange={(e) =>
                setEditingItem({ ...editingItem, summary: e.target.value })
              }
              rows={2}
            />
          </FormField>

          <FormField label="Highlights (Concrete stated activities)">
            <ArrayEditor
              items={editingItem.highlights}
              onChange={(highlights) => setEditingItem({ ...editingItem, highlights })}
              itemPlaceholder="Activity highlight..."
              addLabel="+ Add Highlight"
            />
          </FormField>

          <FormField label="Technologies Used">
            <TagInput
              tags={editingItem.tech}
              onChange={(tech) => setEditingItem({ ...editingItem, tech })}
              placeholder="e.g. Python, Android..."
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
              Save Experience Item
            </button>
          </div>
        </div>
      )}

      {/* Experience Timeline Cards */}
      <div className="space-y-4">
        {draft.experience.map((item, idx) => (
          <div
            key={item.id}
            className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-5 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-h4 font-medium text-[var(--color-text)]">
                    {item.role}
                  </span>
                  <span className="text-small text-[var(--color-accent)]">
                    @ {item.organisation}
                  </span>
                  {item.current && (
                    <span className="rounded bg-[var(--color-live)]/15 px-2 py-0.5 font-mono text-micro text-[var(--color-live)]">
                      Current
                    </span>
                  )}
                </div>
                <p className="font-mono text-micro text-[var(--color-subtle)] mt-0.5">
                  {item.period} · {item.location}
                  {item.duration && ` (${item.duration})`}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleMove(idx, "up")}
                  disabled={idx === 0}
                  className="p-1 text-[var(--color-subtle)] hover:text-[var(--color-text)] disabled:opacity-20"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, "down")}
                  disabled={idx === draft.experience.length - 1}
                  className="p-1 text-[var(--color-subtle)] hover:text-[var(--color-text)] disabled:opacity-20"
                  title="Move down"
                >
                  ↓
                </button>
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
                  title="Delete role"
                >
                  ✕
                </button>
              </div>
            </div>

            <p className="text-small text-[var(--color-muted)]">{item.summary}</p>

            {item.highlights.length > 0 && (
              <ul className="list-disc list-inside text-small text-[var(--color-subtle)] space-y-1">
                {item.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}

            {item.tech.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.tech.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-[var(--color-surface-3)] px-2 py-0.5 text-micro text-[var(--color-muted)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {draft.experience.length === 0 && (
          <div className="glass-well rounded-[var(--radius-panel)] p-8 text-center text-small text-[var(--color-muted)]">
            No experience items in the draft. Click &quot;+ Add Role&quot; to create one.
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Experience Entry"
        description={`Are you sure you want to delete "${deleteTarget?.role} at ${deleteTarget?.organisation}"?`}
        confirmLabel="Delete Entry"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
