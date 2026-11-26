"use client";

import React, { useState, useMemo } from "react";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import { CMS_STORAGE_KEY, loadDraftFromStorage } from "@/lib/cms/storage";
import { validateDraftForPublication } from "@/lib/portfolio/validation";
import {
  compareLocalAndRemoteDrafts,
  mergeDrafts,
} from "@/lib/portfolio/reconciliation";
import { portfolioRepository } from "@/lib/portfolio/repository";
import type { PublicationHistoryItem } from "@/lib/cms/types";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormSection } from "@/components/admin/ui/FormSection";
import { TextArea } from "@/components/admin/ui/TextArea";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";

export default function PublishingCenterPage() {
  const {
    draft,
    publishedDraft,
    remoteDraft,
    hasUnpublishedChanges,
    unpublishedSections,
    isPublishing,
    publicationHistory,
    publishWorkspace,
    rollbackToHistory,
    refreshFromRemote,
    syncError,
  } = usePortfolioDraft();

  const supabaseConfigured = isSupabaseConfigured();
  const [releaseNotes, setReleaseNotes] = useState("");
  const [rollbackTarget, setRollbackTarget] =
    useState<PublicationHistoryItem | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validationIssues = useMemo(
    () => validateDraftForPublication(draft),
    [draft],
  );
  const isValid = validationIssues.length === 0;

  const localStorageBackup =
    typeof window !== "undefined" ? loadDraftFromStorage() : null;
  const reconciliation = useMemo(() => {
    if (!localStorageBackup || !remoteDraft) return null;
    return compareLocalAndRemoteDrafts(localStorageBackup, remoteDraft);
  }, [localStorageBackup, remoteDraft]);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handlePublish = async () => {
    setErrorMsg(null);
    const res = await publishWorkspace(releaseNotes.trim() || undefined);
    if (!res.success) {
      setErrorMsg(res.error ?? "Publishing failed.");
      return;
    }
    setReleaseNotes("");
    notify(
      res.data?.version
        ? `Published snapshot v${res.data.version} live to visitors!`
        : "Changes published to live portfolio!",
    );
  };

  const handleConfirmRollback = async () => {
    if (!rollbackTarget) return;
    setErrorMsg(null);
    const res = await rollbackToHistory(rollbackTarget.id);
    if (!res.success) {
      setErrorMsg(res.error ?? "Unable to restore selected version.");
    } else {
      notify(
        `Restored snapshot from v${rollbackTarget.version}. Visitors now see version v${res.data?.version ?? rollbackTarget.version}.`,
      );
    }
    setRollbackTarget(null);
  };

  const handleExportLocalBackup = () => {
    const source = localStorageBackup ?? draft;
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(source, null, 2));
    const anchor = document.createElement("a");
    anchor.href = dataStr;
    anchor.download = `portfolio-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    notify("Downloaded local workspace JSON backup.");
  };

  const handleReconcile = async (strategy: "import-local" | "keep-remote") => {
    if (!localStorageBackup || !remoteDraft) return;
    setIsReconciling(true);
    setErrorMsg(null);
    try {
      const merged = mergeDrafts(localStorageBackup, remoteDraft, strategy);
      if (strategy === "import-local") {
        const syncRes = await portfolioRepository.syncFullDraftToRemote(merged);
        if (!syncRes.success) {
          setErrorMsg(syncRes.error ?? "Could not import local edits.");
          return;
        }
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(CMS_STORAGE_KEY);
      }
      await refreshFromRemote();
      notify(
        strategy === "import-local"
          ? "Local edits imported and synchronized with Supabase!"
          : "Kept database version and cleared conflicting local cache.",
      );
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Publishing & History"
        description="Save edits freely in your workspace without breaking the live website. Publish verified snapshots when ready, or roll back any time."
      />

      {toast && (
        <div className="rounded-[var(--radius-panel)] border border-[var(--color-live)]/30 bg-[var(--color-live)]/10 px-4 py-2.5 text-small text-[var(--color-live)]">
          ✓ {toast}
        </div>
      )}

      {errorMsg && errorMsg !== syncError && (
        <div className="rounded-[var(--radius-panel)] border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-small text-red-200">
          {errorMsg}
        </div>
      )}

      {/* Publish Card */}
      <FormSection
        title="Publish Workspace Changes"
        description={`Currently live version: ${
          publishedDraft?.publicationMeta?.version
            ? `v${publishedDraft.publicationMeta.version}`
            : "Baseline / Initial"
        }`}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] p-4">
            <div>
              <p className="text-small font-medium text-[var(--color-text)]">
                {hasUnpublishedChanges
                  ? `${unpublishedSections.length} area(s) modified since last publication`
                  : "Workspace matches live website"}
              </p>
              <p className="text-micro text-[var(--color-subtle)] mt-0.5">
                {hasUnpublishedChanges
                  ? `Modified: ${unpublishedSections.join(", ")}`
                  : "You can still create a manual snapshot checkpoint below."}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 font-mono text-micro ${
                hasUnpublishedChanges
                  ? "bg-amber-500/15 text-amber-300"
                  : "bg-[var(--color-live)]/15 text-[var(--color-live)]"
              }`}
            >
              {hasUnpublishedChanges ? "Unpublished Changes" : "Up to Date"}
            </span>
          </div>

          {!isValid && (
            <div className="rounded-[var(--radius-control)] border border-red-500/35 bg-red-500/10 p-3 space-y-1">
              <p className="text-small font-medium text-red-200">
                Please fix before publishing:
              </p>
              <ul className="list-disc pl-5 text-micro text-red-300 space-y-0.5">
                {validationIssues.map((err, i) => (
                  <li key={i}>
                    <strong>{err.section}:</strong> {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-mono text-micro uppercase text-[var(--color-subtle)]">
              Version Notes (optional)
            </label>
            <TextArea
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Updated GramCare architecture, adjusted Tech City glow, added FastAPI connection"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-micro text-[var(--color-subtle)]">
              {supabaseConfigured
                ? "Publishes an atomic public snapshot immediately to Supabase."
                : "Local preview mode: updates local published snapshot preview."}
            </p>
            <button
              type="button"
              disabled={!isValid || isPublishing}
              onClick={() => void handlePublish()}
              className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-6 py-2.5 text-small font-semibold text-[var(--color-void)] hover:opacity-90 disabled:opacity-50"
            >
              {isPublishing ? "Publishing..." : "Publish Changes Live"}
            </button>
          </div>
        </div>
      </FormSection>

      {/* Publication History & Rollback */}
      <FormSection
        title="Publication History & Safe Rollback"
        description="Every publication is stored as a point-in-time snapshot. Restore any previous live state in one click."
      >
        {publicationHistory.length === 0 ? (
          <p className="text-small text-[var(--color-subtle)]">
            No publication log entries loaded yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {publicationHistory.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-4 py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-small font-medium text-[var(--color-text)]">
                      v{item.version}
                    </span>
                    <span className="rounded bg-[var(--color-surface-3)] px-2 py-0.5 font-mono text-micro uppercase text-[var(--color-accent)]">
                      {item.action}
                    </span>
                    {idx === 0 && (
                      <span className="rounded bg-[var(--color-live)]/15 px-2 py-0.5 font-mono text-micro text-[var(--color-live)]">
                        Latest Live
                      </span>
                    )}
                    <span className="text-micro text-[var(--color-subtle)]">
                      {new Date(item.publishedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-micro text-[var(--color-muted)]">
                    {item.summary || "Published portfolio snapshot"}
                    {item.publishedByEmail ? ` · by ${item.publishedByEmail}` : ""}
                    {item.changedSections.length > 0
                      ? ` · Sections: ${item.changedSections.join(", ")}`
                      : ""}
                  </p>
                </div>

                {idx > 0 && (
                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={() => setRollbackTarget(item)}
                    className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-3 py-1.5 text-micro font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-3)]"
                  >
                    Restore v{item.version}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </FormSection>

      {/* Local Draft vs Database Reconciliation */}
      <div id="reconciliation">
        <FormSection
          title="Local Browser Draft vs Database Reconciliation"
          description="Safely inspect local browser edits against the live Supabase database without silent overwrites."
          action={
            <button
              type="button"
              onClick={handleExportLocalBackup}
              className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-3 py-1.5 text-micro text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              Download Local JSON Backup
            </button>
          }
        >
          {!reconciliation ? (
            <p className="text-small text-[var(--color-subtle)]">
              {supabaseConfigured
                ? "No separate unimported local draft detected in this browser."
                : "Connect Supabase to compare browser edits against the remote PostgreSQL database."}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-[var(--hairline)] bg-[var(--color-surface-2)] p-3.5 text-micro text-[var(--color-muted)]">
                <span>
                  {reconciliation.localOnlyCount} local-only ·{" "}
                  {reconciliation.modifiedCount} modified ·{" "}
                  {reconciliation.remoteOnlyCount} database-only ·{" "}
                  {reconciliation.syncedCount} already synchronized
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isReconciling}
                    onClick={() => void handleReconcile("import-local")}
                    className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-3 py-1.5 text-micro font-medium text-[var(--color-void)] hover:opacity-90 disabled:opacity-50"
                  >
                    Import Local Edits to Database
                  </button>
                  <button
                    type="button"
                    disabled={isReconciling}
                    onClick={() => void handleReconcile("keep-remote")}
                    className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-3 py-1.5 text-micro text-[var(--color-text)] hover:bg-[var(--color-surface-3)] disabled:opacity-50"
                  >
                    Keep Database Version
                  </button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {reconciliation.items.map((item) => (
                  <div
                    key={item.key}
                    className="rounded border border-[var(--hairline)] bg-[var(--color-surface-2)] px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-micro font-medium text-[var(--color-text)]">
                        {item.label}
                      </p>
                      <p className="truncate text-micro text-[var(--color-subtle)]">
                        {item.section} · {item.detail}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-micro shrink-0 ${
                        item.status === "synced"
                          ? "bg-[var(--color-live)]/15 text-[var(--color-live)]"
                          : item.status === "modified"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                      }`}
                    >
                      {item.statusLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </FormSection>
      </div>

      <ConfirmDialog
        open={rollbackTarget !== null}
        title="Restore Previous Published Version?"
        description={`Visitors will immediately see the content and Tech City configuration from v${rollbackTarget?.version}. Your rollback action will be recorded in history.`}
        confirmLabel={`Restore v${rollbackTarget?.version}`}
        variant="warning"
        onConfirm={handleConfirmRollback}
        onCancel={() => setRollbackTarget(null)}
      />
    </div>
  );
}
