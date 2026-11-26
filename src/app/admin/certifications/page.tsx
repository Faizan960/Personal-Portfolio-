"use client";

import React, { useState } from "react";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import type { MutableCertification } from "@/lib/cms/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormField } from "@/components/admin/ui/FormField";
import { TextInput } from "@/components/admin/ui/TextInput";
import { SaveIndicator } from "@/components/admin/ui/SaveIndicator";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";

export default function CertificationsCMSPage() {
  const { draft, saveCertificationsAndSync, isSaving, lastSaved, syncError } =
    usePortfolioDraft();
  const [editingCert, setEditingCert] = useState<MutableCertification | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MutableCertification | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const commitCerts = async (next: MutableCertification[], msg: string) => {
    const res = await saveCertificationsAndSync(next);
    if (res.success) {
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleStartNew = () => {
    setEditingCert({
      id: `cert-${Date.now().toString().slice(-4)}`,
      name: "",
      issuer: null,
      issued: null,
      credentialId: null,
      credentialUrl: null,
      isVisible: true,
    });
  };

  const handleSaveCert = async (certToSave: MutableCertification) => {
    if (!certToSave.name.trim()) return;

    const copy = [...draft.certifications];
    const existingIdx = copy.findIndex((c) => c.id === certToSave.id);
    if (existingIdx !== -1) {
      copy[existingIdx] = certToSave;
    } else {
      copy.push(certToSave);
    }
    await commitCerts(copy, `Saved certification "${certToSave.name}".`);
    setEditingCert(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await commitCerts(
      draft.certifications.filter((c) => c.id !== deleteTarget.id),
      `Deleted "${deleteTarget.name}".`,
    );
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Certifications"
        description="Manage professional credentials. Null fields (issuer, dates, ID, URL) are preserved truthfully."
        action={
          <div className="flex items-center gap-3">
            <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
            <button
              type="button"
              onClick={handleStartNew}
              className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90 transition-opacity"
            >
              + Add Certification
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
      {editingCert && (
        <div className="rounded-[var(--radius-panel)] border border-[var(--color-accent)]/40 bg-[var(--color-surface-2)] p-6 space-y-4">
          <h3 className="text-h4 font-medium text-[var(--color-text)]">
            {draft.certifications.some((c) => c.id === editingCert.id)
              ? `Edit Certification: ${editingCert.name}`
              : "New Certification"}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Certification Name" required>
              <TextInput
                value={editingCert.name}
                onChange={(e) =>
                  setEditingCert({ ...editingCert, name: e.target.value })
                }
                placeholder="e.g. Neo4j Certified Professional"
              />
            </FormField>

            <FormField label="Unique ID" required>
              <TextInput
                value={editingCert.id}
                onChange={(e) =>
                  setEditingCert({ ...editingCert, id: e.target.value })
                }
                placeholder="e.g. neo4j-certified-professional"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Issuer"
              helperText="Awarding body or educator. Null if not stated."
            >
              <TextInput
                value={editingCert.issuer ?? ""}
                onChange={(e) =>
                  setEditingCert({
                    ...editingCert,
                    issuer: e.target.value.trim() ? e.target.value : null,
                  })
                }
                placeholder="e.g. Harkirat Singh or null"
              />
            </FormField>

            <FormField
              label="Issue Date"
              helperText="Month/Year issued. Null if unstated."
            >
              <TextInput
                value={editingCert.issued ?? ""}
                onChange={(e) =>
                  setEditingCert({
                    ...editingCert,
                    issued: e.target.value.trim() ? e.target.value : null,
                  })
                }
                placeholder="e.g. 05/2024 or null"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Credential ID">
              <TextInput
                value={editingCert.credentialId ?? ""}
                onChange={(e) =>
                  setEditingCert({
                    ...editingCert,
                    credentialId: e.target.value.trim() ? e.target.value : null,
                  })
                }
                placeholder="e.g. CERT-12345 or null"
              />
            </FormField>

            <FormField label="Verification URL">
              <TextInput
                value={editingCert.credentialUrl ?? ""}
                onChange={(e) =>
                  setEditingCert({
                    ...editingCert,
                    credentialUrl: e.target.value.trim() ? e.target.value : null,
                  })
                }
                placeholder="https://... or null"
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--hairline-faint)]">
            <button
              type="button"
              onClick={() => setEditingCert(null)}
              className="rounded px-4 py-2 text-small text-[var(--color-muted)] hover:bg-[var(--color-surface-3)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveCert(editingCert)}
              className="rounded bg-[var(--color-accent)] px-5 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90"
            >
              Save Certification
            </button>
          </div>
        </div>
      )}

      {/* Certifications List */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {draft.certifications.map((c) => (
          <div
            key={c.id}
            className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-5 space-y-2 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <p className="text-h4 font-medium text-[var(--color-text)]">
                  {c.name}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingCert(JSON.parse(JSON.stringify(c)))}
                    className="rounded bg-[var(--color-surface-2)] px-2 py-1 text-micro text-[var(--color-text)] hover:bg-[var(--color-surface-3)]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(c)}
                    className="p-1 text-red-400 hover:text-red-300"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <p className="font-mono text-micro text-[var(--color-subtle)] mt-1">
                Issuer: {c.issuer ?? "Unstated (null)"}
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--hairline-faint)] font-mono text-micro text-[var(--color-faint)] flex items-center justify-between">
              <span>Issued: {c.issued ?? "None"}</span>
              {c.credentialUrl && (
                <a
                  href={c.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-accent)] hover:underline"
                >
                  Verify ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Certification"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete Certification"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
