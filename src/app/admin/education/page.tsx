"use client";

import React, { useState } from "react";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import type { MutableEducationItem } from "@/lib/cms/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormField } from "@/components/admin/ui/FormField";
import { TextInput } from "@/components/admin/ui/TextInput";
import { ToggleField } from "@/components/admin/ui/ToggleField";
import { ArrayEditor } from "@/components/admin/ui/ArrayEditor";
import { SaveIndicator } from "@/components/admin/ui/SaveIndicator";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";

export default function EducationCMSPage() {
  const { draft, saveEducationAndSync, isSaving, lastSaved, syncError } =
    usePortfolioDraft();
  const [editingItem, setEditingItem] = useState<MutableEducationItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MutableEducationItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const commitEducation = async (next: MutableEducationItem[], msg: string) => {
    const res = await saveEducationAndSync(next);
    if (res.success) {
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleStartNew = () => {
    setEditingItem({
      id: `edu-${Date.now().toString().slice(-4)}`,
      qualification: "",
      award: "BE",
      institution: "",
      period: "",
      location: "Mumbai",
      current: false,
      details: [],
      isVisible: true,
    });
  };

  const handleSaveItem = async (itemToSave: MutableEducationItem) => {
    if (!itemToSave.qualification.trim() || !itemToSave.award.trim()) return;

    const copy = [...draft.education];
    const existingIdx = copy.findIndex((e) => e.id === itemToSave.id);
    if (existingIdx !== -1) {
      copy[existingIdx] = itemToSave;
    } else {
      copy.push(itemToSave);
    }
    await commitEducation(copy, `Saved qualification "${itemToSave.award}".`);
    setEditingItem(null);
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= draft.education.length) return;

    const copy = [...draft.education];
    const [item] = copy.splice(index, 1);
    if (item !== undefined) {
      copy.splice(targetIdx, 0, item);
    }
    await commitEducation(copy, "Education order saved.");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await commitEducation(
      draft.education.filter((e) => e.id !== deleteTarget.id),
      `Deleted "${deleteTarget.qualification}".`,
    );
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Education"
        description="Manage academic qualifications in ascending timeline order (e.g. Diploma precedes Degree)."
        action={
          <div className="flex items-center gap-3">
            <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
            <button
              type="button"
              onClick={handleStartNew}
              className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90 transition-opacity"
            >
              + Add Education
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
            {draft.education.some((e) => e.id === editingItem.id)
              ? `Edit: ${editingItem.award} in ${editingItem.qualification}`
              : "New Education Item"}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Qualification" required>
              <TextInput
                value={editingItem.qualification}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, qualification: e.target.value })
                }
                placeholder="e.g. Computer Engineering"
              />
            </FormField>

            <FormField label="Award (Credential Type)" required>
              <TextInput
                value={editingItem.award}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, award: e.target.value })
                }
                placeholder="e.g. BE or Diploma"
              />
            </FormField>

            <FormField label="Unique ID" required>
              <TextInput
                value={editingItem.id}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, id: e.target.value })
                }
                placeholder="e.g. theem-be-computer-engineering"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Institution">
              <TextInput
                value={editingItem.institution ?? ""}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    institution: e.target.value || null,
                  })
                }
                placeholder="e.g. Theem College of Engineering"
              />
            </FormField>

            <FormField label="Period">
              <TextInput
                value={editingItem.period ?? ""}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    period: e.target.value || null,
                  })
                }
                placeholder="e.g. Expected 08/2027"
              />
            </FormField>

            <FormField label="Location">
              <TextInput
                value={editingItem.location ?? ""}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    location: e.target.value || null,
                  })
                }
                placeholder="e.g. Mumbai"
              />
            </FormField>
          </div>

          <ToggleField
            label="In Progress / Current"
            description="Marks the degree as currently underway."
            checked={editingItem.current}
            onChange={(checked) => setEditingItem({ ...editingItem, current: checked })}
          />

          <FormField label="Details (Coursework, activities — keep truthful)">
            <ArrayEditor
              items={editingItem.details}
              onChange={(details) => setEditingItem({ ...editingItem, details })}
              itemPlaceholder="Detail note..."
              addLabel="+ Add Detail"
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
              Save Education Item
            </button>
          </div>
        </div>
      )}

      {/* Education Cards */}
      <div className="space-y-4">
        {draft.education.map((item, idx) => (
          <div
            key={item.id}
            className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-5 space-y-2"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[var(--color-accent)]/15 px-2 py-0.5 font-mono text-micro text-[var(--color-accent)]">
                    {item.award}
                  </span>
                  <span className="text-h4 font-medium text-[var(--color-text)]">
                    {item.qualification}
                  </span>
                  {item.current && (
                    <span className="rounded bg-[var(--color-live)]/15 px-2 py-0.5 font-mono text-micro text-[var(--color-live)]">
                      Current
                    </span>
                  )}
                </div>
                <p className="font-mono text-micro text-[var(--color-subtle)] mt-1">
                  {item.institution ?? "Institution not stated"} · {item.period ?? "Period not stated"}
                  {item.location && ` (${item.location})`}
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
                  disabled={idx === draft.education.length - 1}
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
                  title="Delete entry"
                >
                  ✕
                </button>
              </div>
            </div>

            {item.details.length > 0 && (
              <ul className="list-disc list-inside text-small text-[var(--color-subtle)] space-y-1 pt-1">
                {item.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Education Entry"
        description={`Are you sure you want to delete "${deleteTarget?.award} - ${deleteTarget?.qualification}"?`}
        confirmLabel="Delete Entry"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
