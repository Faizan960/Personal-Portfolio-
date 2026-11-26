"use client";

import React, { useState, useEffect } from "react";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import { getStorageStats, validatePortfolioDraft } from "@/lib/cms/storage";
import type { PortfolioDraft } from "@/lib/cms/types";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormSection } from "@/components/admin/ui/FormSection";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";

export default function SettingsCMSPage() {
  const { draft, saveCurrentDraft, resetToBaseline } = usePortfolioDraft();
  const [stats, setStats] = useState(getStorageStats());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importCandidate, setImportCandidate] = useState<PortfolioDraft | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setStats(getStorageStats());
  }, [draft]);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(draft, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `portfolio-draft-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setToast("Draft exported as JSON file.");
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (validatePortfolioDraft(parsed)) {
          setImportCandidate(parsed);
          setShowImportConfirm(true);
        } else {
          setImportError("File does not match the required PortfolioDraft schema. Missing required sections.");
        }
      } catch (err) {
        setImportError(`Invalid JSON file: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmImport = () => {
    if (!importCandidate) return;
    saveCurrentDraft(importCandidate);
    setShowImportConfirm(false);
    setImportCandidate(null);
    setToast("Imported JSON draft successfully applied!");
    setTimeout(() => setToast(null), 3000);
  };

  const handleConfirmReset = () => {
    resetToBaseline();
    setShowResetConfirm(false);
    setToast("Draft has been reset to original portfolio.ts baseline!");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Settings & Storage"
        description="Manage workspace backups, browser storage diagnostics, and recovery options."
        action={
          <Link
            href="/admin/publishing/#reconciliation"
            className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-3.5 py-2 text-small text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          >
            Local vs Database Reconciliation →
          </Link>
        }
      />

      {toast && (
        <div className="rounded-[var(--radius-panel)] border border-[var(--color-live)]/30 bg-[var(--color-live)]/10 px-4 py-2.5 text-small text-[var(--color-live)]">
          ✓ {toast}
        </div>
      )}

      {importError && (
        <div className="rounded-[var(--radius-panel)] border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-small text-red-300">
          ✕ {importError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Storage Diagnostics */}
        <FormSection
          title="Development Storage State"
          description="Diagnostics for the browser-local draft cache."
        >
          <div className="space-y-3 font-mono text-small">
            <div className="flex items-center justify-between border-b border-[var(--hairline-faint)] pb-2">
              <span className="text-[var(--color-subtle)]">Storage Key</span>
              <span className="text-[var(--color-text)]">{stats.key}</span>
            </div>

            <div className="flex items-center justify-between border-b border-[var(--hairline-faint)] pb-2">
              <span className="text-[var(--color-subtle)]">Draft Status</span>
              <span className={stats.hasCustomDraft ? "text-amber-300" : "text-[var(--color-subtle)]"}>
                {stats.hasCustomDraft ? "Active custom draft" : "Unmodified (Baseline)"}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[var(--hairline-faint)] pb-2">
              <span className="text-[var(--color-subtle)]">Payload Size</span>
              <span className="text-[var(--color-text)]">
                {(stats.byteSize / 1024).toFixed(2)} KB
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[var(--hairline-faint)] pb-2">
              <span className="text-[var(--color-subtle)]">Last Modified</span>
              <span className="text-[var(--color-text)] truncate max-w-[200px]">
                {stats.lastModified ? new Date(stats.lastModified).toLocaleString() : "Never"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--color-subtle)]">Projects Count</span>
              <span className="text-[var(--color-accent)]">{draft.projects.length}</span>
            </div>
          </div>
        </FormSection>

        {/* Data Backup & Portability */}
        <FormSection
          title="Draft Portability"
          description="Export or import complete local draft states as JSON files."
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-small font-medium text-[var(--color-text)]">Export Draft</p>
                <p className="text-micro text-[var(--color-subtle)]">
                  Download a complete JSON snapshot of all current draft data.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportJSON}
                className="rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-4 py-2 text-small font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-3)]"
              >
                Export JSON
              </button>
            </div>

            <div className="border-t border-[var(--hairline-faint)] pt-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-small font-medium text-[var(--color-text)]">Import Draft</p>
                <p className="text-micro text-[var(--color-subtle)]">
                  Load and validate a previously exported JSON draft file.
                </p>
              </div>
              <label className="cursor-pointer rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-4 py-2 text-small font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-3)]">
                Import JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </FormSection>
      </div>

      {/* Danger Zone */}
      <div className="rounded-[var(--radius-panel)] border border-red-500/20 bg-red-950/10 p-6 space-y-4">
        <h3 className="text-h4 font-medium text-red-300">Danger Zone</h3>
        <p className="text-small text-[var(--color-muted)]">
          Resetting will remove the custom draft from browser localStorage and revert all CMS content to the exact static definitions in <code className="font-mono text-micro text-[var(--color-text)]">src/data/portfolio.ts</code>.
        </p>
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="rounded-[var(--radius-control)] border border-red-500/40 bg-red-900/20 px-4 py-2 text-small font-medium text-red-300 hover:bg-red-900/40 transition-colors"
        >
          Reset to Original Baseline Data
        </button>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        open={showResetConfirm}
        title="Reset to Original Baseline Data?"
        description="All local draft changes will be discarded from browser storage. The CMS will reload the initial static portfolio data."
        confirmLabel="Confirm Reset"
        variant="danger"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* Import Confirmation Dialog */}
      <ConfirmDialog
        open={showImportConfirm}
        title="Apply Imported JSON Draft?"
        description={`This will overwrite the current draft with ${importCandidate?.projects.length ?? 0} projects, ${importCandidate?.skills.length ?? 0} skill categories, and updated profile information.`}
        confirmLabel="Apply Imported Draft"
        variant="warning"
        onConfirm={handleConfirmImport}
        onCancel={() => {
          setShowImportConfirm(false);
          setImportCandidate(null);
        }}
      />
    </div>
  );
}
