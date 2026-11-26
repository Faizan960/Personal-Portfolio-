"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import { getPublicAssetUrl } from "@/lib/supabase/storage";
import type {
  MutableProject,
  MutableProjectStatus,
  MutableProjectVisibility,
  MutableProjectDetail,
} from "@/lib/cms/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormSection } from "@/components/admin/ui/FormSection";
import { FormField } from "@/components/admin/ui/FormField";
import { TextInput } from "@/components/admin/ui/TextInput";
import { TextArea } from "@/components/admin/ui/TextArea";
import { SelectField } from "@/components/admin/ui/SelectField";
import { ToggleField } from "@/components/admin/ui/ToggleField";
import { TagInput } from "@/components/admin/ui/TagInput";
import { ArrayEditor } from "@/components/admin/ui/ArrayEditor";
import { SaveIndicator } from "@/components/admin/ui/SaveIndicator";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";

const EMPTY_DETAIL: MutableProjectDetail = {
  problem: null,
  solution: null,
  features: [],
  architecture: [],
  contribution: null,
  challenges: [],
  lessons: [],
  futureScope: [],
  screenshots: [],
  reservedSections: [],
};

function ProjectEditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isNew = !editId;

  const {
    draft,
    saveProjectAndSync,
    isSaving,
    lastSaved,
    syncError,
  } = usePortfolioDraft();

  // Form state
  const [formData, setFormData] = useState<MutableProject>(() => {
    if (editId) {
      const existing = draft.projects.find((p) => p.id === editId);
      if (existing) {
        return JSON.parse(JSON.stringify(existing));
      }
    }
    return {
      id: "",
      index: String(draft.projects.length + 1).padStart(2, "0"),
      name: "",
      fullTitle: null,
      category: "",
      summary: "",
      tech: [],
      skillIds: [],
      featured: false,
      status: "in-development",
      visibility: "development",
      isPublished: true,
      github: null,
      liveUrl: null,
      image: null,
      detail: JSON.parse(JSON.stringify(EMPTY_DETAIL)),
    };
  });

  const [techSearch, setTechSearch] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sync if existing project loaded after hydration
  useEffect(() => {
    if (editId) {
      const existing = draft.projects.find((p) => p.id === editId);
      if (existing && !isDirty) {
        setFormData(JSON.parse(JSON.stringify(existing)));
      }
    }
  }, [editId, draft.projects, isDirty]);

  const handleChange = <K extends keyof MutableProject>(
    field: K,
    value: MutableProject[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleDetailChange = <K extends keyof MutableProjectDetail>(
    field: K,
    value: MutableProjectDetail[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      detail: { ...prev.detail, [field]: value },
    }));
    setIsDirty(true);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.name.trim()) {
      errs.name = "Project name is required.";
    }

    const trimmedId = formData.id.trim();
    if (!trimmedId) {
      errs.id = "Project ID slug is required (e.g. 'gramcare').";
    } else if (!/^[a-z0-9-]+$/.test(trimmedId)) {
      errs.id = "Project ID must contain only lowercase letters, numbers, and hyphens.";
    } else {
      const duplicate = draft.projects.find(
        (p) => p.id === trimmedId && (isNew || p.id !== editId)
      );
      if (duplicate) {
        errs.id = `A project with ID "${trimmedId}" already exists.`;
      }
    }

    if (!formData.category.trim()) {
      errs.category = "Category is required (e.g. 'AI / Healthcare').";
    }

    if (!formData.summary.trim()) {
      errs.summary = "Summary is required.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const existingIdx = draft.projects.findIndex((p) => p.id === (editId ?? formData.id));
    const sortOrder = existingIdx !== -1 ? existingIdx : draft.projects.length;
    const res = await saveProjectAndSync(formData, sortOrder);
    if (!res.success) return;

    setIsDirty(false);
    setSuccessToast("Project saved! Preview and Publish when ready to go live.");
    setTimeout(() => setSuccessToast(null), 3000);

    if (isNew) {
      router.replace(`/admin/projects/edit/?id=${encodeURIComponent(formData.id)}`);
    }
  };

  // Screenshots management
  const addScreenshot = () => {
    handleDetailChange("screenshots", [
      ...formData.detail.screenshots,
      { src: "", alt: "" },
    ]);
  };

  const updateScreenshot = (index: number, key: "src" | "alt", val: string) => {
    const list = [...formData.detail.screenshots];
    const current = list[index];
    if (current) {
      list[index] = { ...current, [key]: val };
      handleDetailChange("screenshots", list);
    }
  };

  const removeScreenshot = (index: number) => {
    handleDetailChange(
      "screenshots",
      formData.detail.screenshots.filter((_, i) => i !== index)
    );
  };

  // Reserved sections management
  const addReservedSection = () => {
    handleDetailChange("reservedSections", [
      ...formData.detail.reservedSections,
      { label: "", body: null },
    ]);
  };

  const updateReservedSection = (
    index: number,
    key: "label" | "body",
    val: string | null
  ) => {
    const list = [...formData.detail.reservedSections];
    const current = list[index];
    if (current) {
      list[index] = { ...current, [key]: val };
      handleDetailChange("reservedSections", list);
    }
  };

  const removeReservedSection = (index: number) => {
    handleDetailChange(
      "reservedSections",
      formData.detail.reservedSections.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title={isNew ? "Create Project" : `Edit: ${formData.name || formData.id}`}
        description="Configure project presentation, repository visibility, and case study details."
        action={
          <div className="flex items-center gap-3">
            <SaveIndicator isSaving={isSaving} isDirty={isDirty} lastSaved={lastSaved} />
            <Link
              href="/admin/projects/"
              className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-3.5 py-1.5 text-small text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors"
            >
              ← Back to List
            </Link>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-1.5 text-small font-medium text-[var(--color-void)] hover:opacity-90 transition-opacity"
            >
              Save Project
            </button>
          </div>
        }
      />

      {successToast && (
        <div
          role="status"
          className="rounded-[var(--radius-panel)] border border-[var(--color-live)]/30 bg-[var(--color-live)]/10 px-4 py-2.5 text-small text-[var(--color-live)]"
        >
          ✓ {successToast}
        </div>
      )}

      {syncError && (
        <div
          role="alert"
          className="rounded-[var(--radius-panel)] border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-small text-red-200"
        >
          {syncError}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Metadata */}
        <FormSection
          title="Core Identification"
          description="Basic information displayed on portfolio cards and search results."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Project Name" required error={errors.name}>
              <TextInput
                value={formData.name}
                onChange={(e) => {
                  const nameVal = e.target.value;
                  handleChange("name", nameVal);
                  if (isNew && !formData.id) {
                    handleChange(
                      "id",
                      nameVal.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                    );
                  }
                }}
                placeholder="e.g. GramCare"
                error={!!errors.name}
              />
            </FormField>

            <FormField
              label="Project ID (Slug)"
              required
              helperText="Must be unique. Used for URL paths like /work/gramcare"
              error={errors.id}
            >
              <TextInput
                value={formData.id}
                onChange={(e) => handleChange("id", e.target.value.toLowerCase())}
                placeholder="e.g. gramcare"
                error={!!errors.id}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              label="Index"
              helperText="2-digit ordinal accent (e.g. 01, 02)"
            >
              <TextInput
                value={formData.index}
                onChange={(e) => handleChange("index", e.target.value)}
                placeholder="01"
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField
                label="Full Title"
                helperText="Optional subtitle shown on the project case study page"
              >
                <TextInput
                  value={formData.fullTitle ?? ""}
                  onChange={(e) =>
                    handleChange("fullTitle", e.target.value ? e.target.value : null)
                  }
                  placeholder="e.g. AI-Powered Offline Disease Outbreak Monitoring System"
                />
              </FormField>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Category Framing" required error={errors.category}>
              <TextInput
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                placeholder="e.g. AI / Healthcare Technology"
                error={!!errors.category}
              />
            </FormField>

            <div className="flex items-center pt-6">
              <ToggleField
                label="Featured Project"
                description="Promotes this project to the lead surface in the Work section."
                checked={formData.featured}
                onChange={(val) => handleChange("featured", val)}
              />
            </div>
          </div>

          <FormField
            label="Summary"
            required
            helperText="Concise, truthful description of what this project is."
            error={errors.summary}
          >
            <TextArea
              value={formData.summary}
              onChange={(e) => handleChange("summary", e.target.value)}
              rows={3}
              placeholder="Provide a factual summary..."
              error={!!errors.summary}
            />
          </FormField>
        </FormSection>

        {/* Status, Visibility & Links */}
        <FormSection
          title="Status, Visibility & Links"
          description="Control public visibility states and repository linking rules."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Development Status"
              helperText="Null renders no status chip rather than implying completion."
            >
              <SelectField
                value={formData.status ?? "null"}
                onChange={(e) => {
                  const val = e.target.value;
                  handleChange(
                    "status",
                    val === "null" ? null : (val as MutableProjectStatus)
                  );
                }}
                options={[
                  { value: "in-development", label: "In Development" },
                  { value: "concept", label: "Concept" },
                  { value: "planned", label: "Planned" },
                  { value: "null", label: "Unspecified (null)" },
                ]}
              />
            </FormField>

            <FormField
              label="Repository Visibility"
              helperText="Only 'public' renders an active GitHub link to visitors."
            >
              <SelectField
                value={formData.visibility}
                onChange={(e) =>
                  handleChange("visibility", e.target.value as MutableProjectVisibility)
                }
                options={[
                  { value: "public", label: "Public (verified reachable)" },
                  { value: "private", label: "Private (exists, no public link)" },
                  { value: "development", label: "Development (actively built, no repo)" },
                  { value: "unknown", label: "Unknown (renders nothing)" },
                ]}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="GitHub Repository URL">
              <TextInput
                value={formData.github ?? ""}
                onChange={(e) =>
                  handleChange("github", e.target.value ? e.target.value : null)
                }
                placeholder="https://github.com/Faizan960/..."
              />
            </FormField>

            <FormField label="Live Deployed URL">
              <TextInput
                value={formData.liveUrl ?? ""}
                onChange={(e) =>
                  handleChange("liveUrl", e.target.value ? e.target.value : null)
                }
                placeholder="https://example.com"
              />
            </FormField>

            <FormField label="Cover Image Path">
              <div className="space-y-1.5">
                <TextInput
                  value={formData.image ?? ""}
                  onChange={(e) =>
                    handleChange("image", e.target.value ? e.target.value : null)
                  }
                  placeholder="/projects/example.png or public media URL"
                />
                {(draft.media ?? []).filter((m) => m.bucketId === "portfolio-public").length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleChange("image", e.target.value);
                      }
                    }}
                    className="w-full rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-2.5 py-1 text-micro text-[var(--color-muted)] outline-none"
                  >
                    <option value="">Attach from Media Library...</option>
                    {(draft.media ?? [])
                      .filter((m) => m.bucketId === "portfolio-public")
                      .map((m) => {
                        const url = getPublicAssetUrl(m.storagePath) ?? m.storagePath;
                        return (
                          <option key={m.id} value={url}>
                            {m.filename}
                          </option>
                        );
                      })}
                  </select>
                )}
              </div>
            </FormField>
          </div>

          <div className="rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--color-surface-2)] p-4">
            <ToggleField
              label="Show on Public Portfolio & Tech City"
              description="Keep repository transparency truthful (e.g. 'development') while independently choosing whether this project is live on your public portfolio when you publish."
              checked={formData.isPublished !== false}
              onChange={(val) => handleChange("isPublished", val)}
            />
          </div>

          <FormField
            label="Technologies Used"
            helperText="Confirmed technologies only. Type a technology or pick from your Technologies dictionary below."
          >
            <div className="space-y-2.5">
              <TagInput
                tags={formData.tech}
                onChange={(tags) => handleChange("tech", tags)}
                placeholder="e.g. Python, Next.js, Kotlin..."
              />
              {(draft.technologies ?? []).length > 0 && (
                <div className="rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-micro uppercase text-[var(--color-subtle)]">
                      Quick-Add from Technologies Dictionary
                    </span>
                    <input
                      type="text"
                      value={techSearch}
                      onChange={(e) => setTechSearch(e.target.value)}
                      placeholder="Filter..."
                      className="w-40 rounded bg-[var(--color-surface-3)] px-2 py-0.5 text-micro text-[var(--color-text)] outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(draft.technologies ?? [])
                      .filter((t) =>
                        !techSearch.trim()
                          ? true
                          : t.name.toLowerCase().includes(techSearch.toLowerCase()),
                      )
                      .map((t) => {
                        const active = formData.tech.some(
                          (item) => item.toLowerCase() === t.name.toLowerCase(),
                        );
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              if (active) {
                                handleChange(
                                  "tech",
                                  formData.tech.filter(
                                    (item) => item.toLowerCase() !== t.name.toLowerCase(),
                                  ),
                                );
                              } else {
                                handleChange("tech", [...formData.tech, t.name]);
                              }
                            }}
                            className={`rounded-full px-2.5 py-0.5 text-micro border transition-colors ${
                              active
                                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                                : "border-[var(--hairline)] bg-[var(--color-surface-3)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
                            }`}
                          >
                            {active ? "✓ " : "+ "}
                            {t.name}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </FormField>

          <FormField
            label="Connected Portfolio Skills"
            helperText="Select specific skills demonstrated by this project. These create verified connections inside Tech City."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {draft.skills.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] p-3 space-y-2"
                >
                  <p className="font-mono text-micro uppercase tracking-wider text-[var(--color-subtle)]">
                    {cat.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((skillName) => {
                      const slug = skillName
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "");
                      const skillId = `${cat.id}:${slug}`;
                      const selectedIds = formData.skillIds ?? [];
                      const isChecked = selectedIds.includes(skillId);
                      return (
                        <button
                          key={skillId}
                          type="button"
                          onClick={() => {
                            const next = isChecked
                              ? selectedIds.filter((id) => id !== skillId)
                              : [...selectedIds, skillId];
                            handleChange("skillIds", next);
                          }}
                          className={`rounded-full px-2.5 py-0.5 text-micro border transition-colors ${
                            isChecked
                              ? "border-[var(--color-live)] bg-[var(--color-live)]/15 text-[var(--color-live)]"
                              : "border-[var(--hairline)] bg-[var(--color-surface-3)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
                          }`}
                        >
                          {isChecked ? "✓ " : "+ "}
                          {skillName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </FormField>
        </FormSection>

        {/* Case Study Detail */}
        <FormSection
          title="Case Study Detail"
          description="Expanded documentation for the /work/[slug] case study route."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Problem Statement">
              <TextArea
                value={formData.detail.problem ?? ""}
                onChange={(e) =>
                  handleDetailChange("problem", e.target.value ? e.target.value : null)
                }
                rows={3}
                placeholder="The problem this project addresses..."
              />
            </FormField>

            <FormField label="Proposed Solution">
              <TextArea
                value={formData.detail.solution ?? ""}
                onChange={(e) =>
                  handleDetailChange("solution", e.target.value ? e.target.value : null)
                }
                rows={3}
                placeholder="The approach taken or proposed..."
              />
            </FormField>
          </div>

          <FormField label="Contribution (for team projects)">
            <TextArea
              value={formData.detail.contribution ?? ""}
              onChange={(e) =>
                handleDetailChange(
                  "contribution",
                  e.target.value ? e.target.value : null
                )
              }
              rows={2}
              placeholder="Specific personal contribution..."
            />
          </FormField>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField label="Key Features">
              <ArrayEditor
                items={formData.detail.features}
                onChange={(items) => handleDetailChange("features", items)}
                itemPlaceholder="Feature highlight..."
                addLabel="+ Add Feature"
              />
            </FormField>

            <FormField label="Architecture Components">
              <ArrayEditor
                items={formData.detail.architecture}
                onChange={(items) => handleDetailChange("architecture", items)}
                itemPlaceholder="Architecture note..."
                addLabel="+ Add Architecture Note"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <FormField label="Challenges">
              <ArrayEditor
                items={formData.detail.challenges}
                onChange={(items) => handleDetailChange("challenges", items)}
                itemPlaceholder="Challenge faced..."
                addLabel="+ Add Challenge"
              />
            </FormField>

            <FormField label="Lessons Learned">
              <ArrayEditor
                items={formData.detail.lessons}
                onChange={(items) => handleDetailChange("lessons", items)}
                itemPlaceholder="Lesson learned..."
                addLabel="+ Add Lesson"
              />
            </FormField>

            <FormField label="Future Scope">
              <ArrayEditor
                items={formData.detail.futureScope}
                onChange={(items) => handleDetailChange("futureScope", items)}
                itemPlaceholder="Future milestone..."
                addLabel="+ Add Scope Item"
              />
            </FormField>
          </div>

          {/* Reserved Sections */}
          <div className="space-y-3 pt-2 border-t border-[var(--hairline-faint)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-small font-medium text-[var(--color-text)]">
                  Reserved Sections (Planned Outline)
                </p>
                <p className="text-micro text-[var(--color-subtle)]">
                  Sections planned for future write-ups. If body is null, renders as a reserved outline slot.
                </p>
              </div>
              <button
                type="button"
                onClick={addReservedSection}
                className="rounded border border-[var(--hairline)] px-2.5 py-1 text-micro text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
              >
                + Add Reserved Row
              </button>
            </div>

            {formData.detail.reservedSections.map((sec, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] p-2.5"
              >
                <input
                  type="text"
                  value={sec.label}
                  onChange={(e) => updateReservedSection(idx, "label", e.target.value)}
                  placeholder="Section Label (e.g. AI Component)"
                  className="w-48 rounded bg-[var(--color-surface-3)] px-2.5 py-1 text-small text-[var(--color-text)] outline-none"
                />
                <input
                  type="text"
                  value={sec.body ?? ""}
                  onChange={(e) =>
                    updateReservedSection(
                      idx,
                      "body",
                      e.target.value.trim() ? e.target.value : null
                    )
                  }
                  placeholder="Body text or leave empty for null (planned)"
                  className="flex-1 min-w-[200px] rounded bg-[var(--color-surface-3)] px-2.5 py-1 text-small text-[var(--color-text)] outline-none"
                />
                <span className="font-mono text-micro text-[var(--color-faint)]">
                  {sec.body === null ? "[Null/Reserved]" : "[Documented]"}
                </span>
                <button
                  type="button"
                  onClick={() => removeReservedSection(idx)}
                  className="p-1 text-red-400 hover:text-red-300"
                  title="Remove row"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Screenshots */}
          <div className="space-y-3 pt-2 border-t border-[var(--hairline-faint)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-small font-medium text-[var(--color-text)]">
                  Case Study Screenshots
                </p>
                <p className="text-micro text-[var(--color-subtle)]">
                  Image path and descriptive alt text.
                </p>
              </div>
              <button
                type="button"
                onClick={addScreenshot}
                className="rounded border border-[var(--hairline)] px-2.5 py-1 text-micro text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
              >
                + Add Screenshot
              </button>
            </div>

            {formData.detail.screenshots.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] p-2.5"
              >
                <input
                  type="text"
                  value={s.src}
                  onChange={(e) => updateScreenshot(idx, "src", e.target.value)}
                  placeholder="/projects/screenshot.png"
                  className="flex-1 rounded bg-[var(--color-surface-3)] px-2.5 py-1 text-small text-[var(--color-text)] outline-none"
                />
                <input
                  type="text"
                  value={s.alt}
                  onChange={(e) => updateScreenshot(idx, "alt", e.target.value)}
                  placeholder="Alt text description"
                  className="flex-1 rounded bg-[var(--color-surface-3)] px-2.5 py-1 text-small text-[var(--color-text)] outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeScreenshot(idx)}
                  className="p-1 text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </FormSection>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-[var(--hairline)] pt-4">
          <button
            type="button"
            onClick={() => {
              if (isDirty) {
                setShowDiscardDialog(true);
              } else {
                router.push("/admin/projects/");
              }
            }}
            className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-4 py-2 text-small text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors"
          >
            Cancel / Discard
          </button>

          <button
            type="submit"
            className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-6 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90 transition-opacity"
          >
            Save Project
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={showDiscardDialog}
        title="Discard Unsaved Changes?"
        description="You have unsaved changes in this project. Discarding will revert to the last saved draft."
        confirmLabel="Discard Changes"
        variant="warning"
        onConfirm={() => {
          setShowDiscardDialog(false);
          router.push("/admin/projects/");
        }}
        onCancel={() => setShowDiscardDialog(false)}
      />
    </div>
  );
}

export default function ProjectEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-small font-mono text-[var(--color-subtle)]">
          Loading project editor...
        </div>
      }
    >
      <ProjectEditorInner />
    </Suspense>
  );
}
