"use client";

import React, { useState, useMemo } from "react";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import type { MutableMediaAsset } from "@/lib/cms/types";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  validateMediaFile,
  uploadAsset,
  deleteStorageAsset,
  getPublicAssetUrl,
  getPrivateSignedUrl,
} from "@/lib/supabase/storage";
import { portfolioRepository } from "@/lib/portfolio/repository";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormSection } from "@/components/admin/ui/FormSection";
import { TextInput } from "@/components/admin/ui/TextInput";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";

export default function MediaCMSPage() {
  const {
    draft,
    saveProjectAndSync,
    refreshFromRemote,
    updateDraft,
    isSaving,
  } = usePortfolioDraft();

  const supabaseConfigured = isSupabaseConfigured();
  const [bucket, setBucket] = useState<"portfolio-public" | "portfolio-private">(
    "portfolio-public",
  );
  const [altText, setAltText] = useState("");
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState<"all" | "portfolio-public" | "portfolio-private">("all");
  const [isUploading, setIsUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [attachTarget, setAttachTarget] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<MutableMediaAsset | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaAssets = useMemo(() => draft.media ?? [], [draft.media]);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const filteredAssets = useMemo(() => {
    return mediaAssets.filter((m) => {
      const matchesBucket =
        bucketFilter === "all" || m.bucketId === bucketFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        m.filename.toLowerCase().includes(q) ||
        (m.altText ?? "").toLowerCase().includes(q);
      return matchesBucket && matchesSearch;
    });
  }, [mediaAssets, bucketFilter, search]);

  // Also summarize local/static paths referenced by projects & resume
  const referencedStaticAssets = useMemo(() => {
    const refs: { source: string; path: string; alt?: string }[] = [];
    draft.projects.forEach((p) => {
      if (p.image) refs.push({ source: `Project cover: ${p.name}`, path: p.image });
      p.detail.screenshots.forEach((s) =>
        refs.push({ source: `Screenshot: ${p.name}`, path: s.src, alt: s.alt }),
      );
    });
    if (draft.personal.resumeHref) {
      refs.push({ source: "Resume link", path: draft.personal.resumeHref });
    }
    return refs;
  }, [draft.projects, draft.personal.resumeHref]);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!supabaseConfigured) {
      setErrorMsg("Cloud upload is unavailable in local development mode.");
      return;
    }

    const validationError = validateMediaFile(file, bucket);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `uploads/${Date.now()}-${safeName}`;
      const uploadRes = await uploadAsset({ bucket, path: storagePath, file });
      if (uploadRes.error || !uploadRes.path) {
        setErrorMsg(uploadRes.error ?? "File upload failed.");
        return;
      }

      const newAsset: MutableMediaAsset = {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `media-${Date.now()}`,
        filename: safeName,
        originalFilename: file.name,
        bucketId: bucket,
        storagePath: uploadRes.path,
        mimeType: file.type,
        sizeBytes: file.size,
        altText: altText.trim() || file.name.replace(/\.[^/.]+$/, ""),
        mediaType: file.type.startsWith("image/") ? "image" : "document",
        isPublished: bucket === "portfolio-public",
      };

      const dbRes = await portfolioRepository.upsertMediaAsset(newAsset);
      if (!dbRes.success) {
        setErrorMsg(dbRes.error ?? "Uploaded file, but could not record metadata.");
        return;
      }

      updateDraft((prev) => ({
        ...prev,
        media: [newAsset, ...(prev.media ?? [])],
      }));
      setAltText("");
      await refreshFromRemote();
      notify(`Uploaded "${file.name}" to ${bucket}.`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenPrivatePreview = async (asset: MutableMediaAsset) => {
    setErrorMsg(null);
    const signedUrl = await getPrivateSignedUrl(asset.storagePath, 3600);
    if (!signedUrl) {
      setErrorMsg("Unable to create temporary preview link.");
      return;
    }
    setSignedUrls((prev) => ({ ...prev, [asset.id]: signedUrl }));
  };

  const handleSaveAltText = async (asset: MutableMediaAsset, nextAlt: string) => {
    const updated: MutableMediaAsset = {
      ...asset,
      altText: nextAlt.trim() || null,
    };
    const res = await portfolioRepository.upsertMediaAsset(updated);
    if (!res.success) {
      setErrorMsg(res.error ?? "Unable to update alt text.");
      return;
    }
    updateDraft((prev) => ({
      ...prev,
      media: (prev.media ?? []).map((m) => (m.id === asset.id ? updated : m)),
    }));
    notify(`Updated alt text for "${asset.filename}".`);
  };

  const handleAttachToProject = async (asset: MutableMediaAsset) => {
    const targetProjectId = attachTarget[asset.id] || draft.projects[0]?.id;
    const projectIdx = draft.projects.findIndex((p) => p.id === targetProjectId);
    const project = draft.projects[projectIdx];
    if (!project) return;

    const url =
      asset.bucketId === "portfolio-public"
        ? getPublicAssetUrl(asset.storagePath) ?? asset.storagePath
        : asset.storagePath;

    const res = await saveProjectAndSync(
      { ...project, image: url },
      projectIdx,
    );
    if (res.success) {
      notify(`Attached "${asset.filename}" as cover image on "${project.name}".`);
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setErrorMsg(null);
    const storageRes = await deleteStorageAsset(
      deleteTarget.bucketId,
      deleteTarget.storagePath,
    );
    if (storageRes.error) {
      setErrorMsg(storageRes.error);
      setDeleteTarget(null);
      return;
    }
    const dbRes = await portfolioRepository.deleteMediaAssetRecord(deleteTarget.id);
    if (!dbRes.success) {
      setErrorMsg(dbRes.error ?? "Unable to remove media record.");
      setDeleteTarget(null);
      return;
    }
    updateDraft((prev) => ({
      ...prev,
      media: (prev.media ?? []).filter((m) => m.id !== deleteTarget.id),
    }));
    notify(`Removed "${deleteTarget.filename}".`);
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Media Library"
        description="Upload images and documents to Supabase Storage, organize public vs private files, edit alt text, and attach visuals to projects."
      />

      {toast && (
        <div className="rounded-[var(--radius-panel)] border border-[var(--color-live)]/30 bg-[var(--color-live)]/10 px-4 py-2.5 text-small text-[var(--color-live)]">
          ✓ {toast}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-[var(--radius-panel)] border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-small text-red-200">
          {errorMsg}
        </div>
      )}

      {/* Upload Section */}
      <FormSection
        title="Upload Asset"
        description={
          supabaseConfigured
            ? "Allowed: JPEG, PNG, WebP, SVG (max 10 MB public), PDF (max 50 MB private)."
            : "Connect Supabase environment variables to upload files to cloud storage."
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
          <label className="space-y-1 text-micro text-[var(--color-subtle)]">
            <span>Storage Visibility</span>
            <select
              value={bucket}
              onChange={(e) =>
                setBucket(
                  e.target.value as "portfolio-public" | "portfolio-private",
                )
              }
              className="w-full rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-3 py-2 text-small text-[var(--color-text)] outline-none"
            >
              <option value="portfolio-public">Public Media (10 MB max)</option>
              <option value="portfolio-private">Private Documents (50 MB max)</option>
            </select>
          </label>

          <label className="space-y-1 text-micro text-[var(--color-subtle)]">
            <span>Descriptive Alt Text</span>
            <TextInput
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image for accessibility..."
            />
          </label>

          <div>
            <label
              className={`inline-flex w-full cursor-pointer items-center justify-center rounded-[var(--radius-control)] px-4 py-2 text-small font-medium transition-opacity ${
                supabaseConfigured && !isUploading
                  ? "bg-[var(--color-accent)] text-[var(--color-void)] hover:opacity-90"
                  : "bg-[var(--color-surface-3)] text-[var(--color-faint)] cursor-not-allowed"
              }`}
            >
              {isUploading ? "Uploading..." : "+ Choose & Upload File"}
              <input
                type="file"
                disabled={!supabaseConfigured || isUploading}
                accept="image/jpeg,image/png,image/webp,image/svg+xml,application/pdf"
                onChange={handleUploadFile}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </FormSection>

      {/* Filter Uploaded Assets */}
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--color-surface-1)] p-3">
        <div className="flex-1 min-w-[200px]">
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search uploaded files by filename or alt text..."
          />
        </div>
        <select
          value={bucketFilter}
          onChange={(e) =>
            setBucketFilter(
              e.target.value as "all" | "portfolio-public" | "portfolio-private",
            )
          }
          className="rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-3 py-2 text-small text-[var(--color-text)] outline-none"
        >
          <option value="all">All buckets</option>
          <option value="portfolio-public">Public Bucket</option>
          <option value="portfolio-private">Private Bucket</option>
        </select>
      </div>

      {/* Uploaded Cloud Assets */}
      <section className="space-y-3">
        <h2 className="font-mono text-micro uppercase tracking-[0.16em] text-[var(--color-subtle)]">
          Uploaded Cloud Assets ({filteredAssets.length})
        </h2>

        {filteredAssets.length === 0 ? (
          <div className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-8 text-center text-small text-[var(--color-subtle)]">
            No cloud media files found. Upload a project cover image, screenshot, or PDF above.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAssets.map((asset) => {
              const publicUrl =
                asset.bucketId === "portfolio-public"
                  ? getPublicAssetUrl(asset.storagePath)
                  : signedUrls[asset.id] ?? null;
              const isImage = asset.mimeType?.startsWith("image/");

              return (
                <div
                  key={asset.id}
                  className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-4 space-y-3"
                >
                  <div className="aspect-video rounded bg-[var(--color-surface-3)] overflow-hidden flex items-center justify-center border border-[var(--hairline-faint)]">
                    {publicUrl && isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={publicUrl}
                        alt={asset.altText ?? asset.filename}
                        className="h-full w-full object-cover"
                      />
                    ) : publicUrl ? (
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-micro font-mono text-[var(--color-accent)] hover:underline"
                      >
                        Open Document Preview ↗
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleOpenPrivatePreview(asset)}
                        className="rounded border border-[var(--hairline)] px-3 py-1.5 text-micro text-[var(--color-muted)] hover:text-[var(--color-text)]"
                      >
                        Load Private Signed Preview
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-small text-[var(--color-text)]">
                      {asset.filename}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-micro ${
                        asset.bucketId === "portfolio-public"
                          ? "bg-[var(--color-live)]/15 text-[var(--color-live)]"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {asset.bucketId === "portfolio-public" ? "Public" : "Private"}
                    </span>
                  </div>

                  <input
                    type="text"
                    defaultValue={asset.altText ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (asset.altText ?? "")) {
                        void handleSaveAltText(asset, e.target.value);
                      }
                    }}
                    placeholder="Alt text..."
                    className="w-full rounded border border-[var(--hairline)] bg-[var(--color-surface-2)] px-2.5 py-1 text-micro text-[var(--color-text)] outline-none"
                  />

                  <div className="flex items-center gap-2 pt-1">
                    {asset.bucketId === "portfolio-public" && draft.projects.length > 0 && (
                      <>
                        <select
                          value={attachTarget[asset.id] || draft.projects[0]?.id}
                          onChange={(e) =>
                            setAttachTarget((prev) => ({
                              ...prev,
                              [asset.id]: e.target.value,
                            }))
                          }
                          className="flex-1 min-w-0 rounded border border-[var(--hairline)] bg-[var(--color-surface-2)] px-2 py-1 text-micro text-[var(--color-text)] outline-none"
                        >
                          {draft.projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void handleAttachToProject(asset)}
                          className="rounded bg-[var(--color-surface-3)] px-2.5 py-1 text-micro text-[var(--color-accent)] hover:bg-[var(--color-surface-2)] shrink-0"
                        >
                          Set Cover
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(asset)}
                      className="ml-auto rounded p-1 text-micro text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Referenced Local/URL Assets */}
      {referencedStaticAssets.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-mono text-micro uppercase tracking-[0.16em] text-[var(--color-subtle)]">
            Referenced Project &amp; Profile Paths ({referencedStaticAssets.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {referencedStaticAssets.map((ref, idx) => (
              <div
                key={`${ref.source}-${idx}`}
                className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-3.5 space-y-1.5"
              >
                <p className="font-mono text-micro text-[var(--color-accent)]">
                  {ref.source}
                </p>
                <p className="font-mono text-micro text-[var(--color-text)] break-all">
                  {ref.path}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Media File?"
        description={`Remove "${deleteTarget?.filename}" permanently from Supabase Storage and the Media Library?`}
        confirmLabel="Delete Asset"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
