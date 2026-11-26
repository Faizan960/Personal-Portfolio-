"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import type { MutableProject } from "@/lib/cms/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/ui/DataTable";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { SaveIndicator } from "@/components/admin/ui/SaveIndicator";
import { cn } from "@/lib/cn";

export default function ProjectsListPage() {
  const {
    draft,
    saveProjectAndSync,
    saveProjectsOrderAndSync,
    deleteProjectAndSync,
    isSaving,
    lastSaved,
    syncError,
  } = usePortfolioDraft();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [publishFilter, setPublishFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<MutableProject | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredProjects = useMemo(() => {
    return draft.projects.filter((p) => {
      const matchesSearch =
        search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.fullTitle && p.fullTitle.toLowerCase().includes(search.toLowerCase())) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        p.tech.some((t) => t.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "null" ? p.status === null : p.status === statusFilter);

      const matchesVisibility =
        visibilityFilter === "all" || p.visibility === visibilityFilter;

      const isPublished = p.isPublished !== false;
      const matchesPublish =
        publishFilter === "all" ||
        (publishFilter === "published" ? isPublished : !isPublished);

      return matchesSearch && matchesStatus && matchesVisibility && matchesPublish;
    });
  }, [draft.projects, search, statusFilter, visibilityFilter, publishFilter]);

  const handleToggleFeatured = async (project: MutableProject, index: number) => {
    const res = await saveProjectAndSync(
      { ...project, featured: !project.featured },
      index,
    );
    if (res.success) showToast(`Updated featured state for "${project.name}".`);
  };

  const handleTogglePublished = async (project: MutableProject, index: number) => {
    const nextState = project.isPublished === false;
    const res = await saveProjectAndSync(
      { ...project, isPublished: nextState },
      index,
    );
    if (res.success) {
      showToast(
        nextState
          ? `"${project.name}" marked visible when published.`
          : `"${project.name}" hidden from public website & Tech City.`,
      );
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= draft.projects.length) return;

    const copy = [...draft.projects];
    const [item] = copy.splice(index, 1);
    if (item !== undefined) {
      copy.splice(targetIdx, 0, item);
    }
    const res = await saveProjectsOrderAndSync(copy);
    if (res.success) showToast("Project order saved.");
  };

  const handleDuplicate = async (project: MutableProject) => {
    const newId = `${project.id}-copy-${Date.now().toString().slice(-4)}`;
    const newIndex = String(draft.projects.length + 1).padStart(2, "0");
    const duplicated: MutableProject = {
      ...project,
      id: newId,
      index: newIndex,
      name: `${project.name} (Copy)`,
      featured: false,
      isPublished: false,
      detail: {
        ...project.detail,
        features: [...project.detail.features],
        architecture: [...project.detail.architecture],
        challenges: [...project.detail.challenges],
        lessons: [...project.detail.lessons],
        futureScope: [...project.detail.futureScope],
        screenshots: project.detail.screenshots.map((s) => ({ ...s })),
        reservedSections: project.detail.reservedSections.map((r) => ({ ...r })),
      },
    };

    const res = await saveProjectAndSync(duplicated, draft.projects.length);
    if (res.success) showToast(`Duplicated "${project.name}" as hidden draft.`);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const res = await deleteProjectAndSync(deleteTarget.id);
    if (res.success) showToast(`Deleted "${deleteTarget.name}".`);
    setDeleteTarget(null);
  };

  const columns: Column<MutableProject>[] = [
    {
      key: "index",
      header: "#",
      className: "w-12 font-mono text-micro text-[var(--color-faint)]",
      render: (p) => p.index,
    },
    {
      key: "name",
      header: "Project",
      render: (p) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--color-text)]">{p.name}</span>
            {p.featured && (
              <span className="rounded bg-[var(--color-accent-warm)]/15 px-1.5 py-0.5 font-mono text-micro text-[var(--color-accent-warm)]">
                Featured
              </span>
            )}
          </div>
          <p className="text-micro text-[var(--color-subtle)] truncate max-w-xs">
            {p.fullTitle ?? p.category}
          </p>
        </div>
      ),
    },
    {
      key: "published",
      header: "Website",
      render: (p) => {
        const originalIndex = draft.projects.findIndex((item) => item.id === p.id);
        const pub = p.isPublished !== false;
        return (
          <button
            type="button"
            onClick={() => handleTogglePublished(p, originalIndex)}
            className={cn(
              "rounded-full px-2.5 py-0.5 font-mono text-micro transition-colors",
              pub
                ? "bg-[var(--color-live)]/15 text-[var(--color-live)] hover:bg-[var(--color-live)]/25"
                : "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25",
            )}
          >
            {pub ? "Live Eligible" : "Hidden Draft"}
          </button>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (p) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          "in-development": { label: "In Development", color: "text-[var(--color-live)]" },
          concept: { label: "Concept", color: "text-[var(--color-accent)]" },
          planned: { label: "Planned", color: "text-[var(--color-accent-warm)]" },
        };
        const st = p.status ? statusMap[p.status] : null;
        return st ? (
          <span className={cn("font-mono text-micro uppercase tracking-wider", st.color)}>
            {st.label}
          </span>
        ) : (
          <span className="font-mono text-micro text-[var(--color-faint)]">—</span>
        );
      },
    },
    {
      key: "visibility",
      header: "Repository",
      render: (p) => (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-mono text-micro capitalize",
            p.visibility === "public"
              ? "bg-[var(--color-live)]/10 text-[var(--color-live)]"
              : p.visibility === "development"
              ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
              : "bg-[var(--color-surface-3)] text-[var(--color-subtle)]",
          )}
        >
          {p.visibility}
        </span>
      ),
    },
    {
      key: "tech",
      header: "Stack",
      render: (p) => (
        <div className="flex flex-wrap gap-1 max-w-[180px]">
          {p.tech.length > 0 ? (
            p.tech.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-micro text-[var(--color-muted)]"
              >
                {t}
              </span>
            ))
          ) : (
            <span className="text-micro text-[var(--color-faint)]">None stated</span>
          )}
          {p.tech.length > 3 && (
            <span className="text-micro text-[var(--color-faint)]">+{p.tech.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (p) => {
        const originalIndex = draft.projects.findIndex((item) => item.id === p.id);
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => handleToggleFeatured(p, originalIndex)}
              title={p.featured ? "Remove featured" : "Mark as featured"}
              className={cn(
                "p-1.5 rounded text-small transition-colors",
                p.featured
                  ? "text-[var(--color-accent-warm)] hover:text-amber-300"
                  : "text-[var(--color-faint)] hover:text-[var(--color-muted)]",
              )}
            >
              ★
            </button>
            <button
              type="button"
              onClick={() => handleMove(originalIndex, "up")}
              disabled={originalIndex === 0}
              title="Move up"
              className="p-1.5 text-small text-[var(--color-subtle)] hover:text-[var(--color-text)] disabled:opacity-20 disabled:cursor-not-allowed"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => handleMove(originalIndex, "down")}
              disabled={originalIndex === draft.projects.length - 1}
              title="Move down"
              className="p-1.5 text-small text-[var(--color-subtle)] hover:text-[var(--color-text)] disabled:opacity-20 disabled:cursor-not-allowed"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => handleDuplicate(p)}
              title="Duplicate project"
              className="p-1.5 text-small text-[var(--color-subtle)] hover:text-[var(--color-accent)]"
            >
              ⧉
            </button>
            <Link
              href={`/admin/projects/edit/?id=${encodeURIComponent(p.id)}`}
              title="Edit project"
              className="rounded bg-[var(--color-surface-2)] px-2.5 py-1 text-micro font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-3)] transition-colors"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => setDeleteTarget(p)}
              title="Delete project"
              className="rounded p-1 text-[var(--color-subtle)] hover:text-red-400"
            >
              ✕
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Projects"
        description="Manage portfolio projects, case studies, skills links, repository transparency, and public visibility."
        action={
          <div className="flex items-center gap-3">
            <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
            <Link
              href="/admin/projects/edit/"
              className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90 transition-opacity"
            >
              + New Project
            </Link>
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

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--color-surface-1)] p-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name, category, tech..."
            className="w-full rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-3 py-1.5 text-small text-[var(--color-text)] placeholder:text-[var(--color-faint)] focus:border-[var(--color-accent)] outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="pub-filter" className="text-micro font-mono text-[var(--color-subtle)] uppercase">
            Website:
          </label>
          <select
            id="pub-filter"
            value={publishFilter}
            onChange={(e) => setPublishFilter(e.target.value)}
            className="rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-small text-[var(--color-text)] outline-none"
          >
            <option value="all">All</option>
            <option value="published">Live Eligible</option>
            <option value="hidden">Hidden Draft</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-micro font-mono text-[var(--color-subtle)] uppercase">
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-small text-[var(--color-text)] outline-none"
          >
            <option value="all">All statuses</option>
            <option value="concept">Concept</option>
            <option value="in-development">In Development</option>
            <option value="planned">Planned</option>
            <option value="null">Unstated</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="vis-filter" className="text-micro font-mono text-[var(--color-subtle)] uppercase">
            Repo:
          </label>
          <select
            id="vis-filter"
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-small text-[var(--color-text)] outline-none"
          >
            <option value="all">All repos</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="development">Development</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

      {/* Projects table */}
      <DataTable
        columns={columns}
        data={filteredProjects}
        keyField="id"
        emptyMessage={
          search || statusFilter !== "all" || visibilityFilter !== "all" || publishFilter !== "all"
            ? "No projects match your filter criteria."
            : "No projects yet. Click '+ New Project' to add one."
        }
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Project"
        description={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.id})?`}
        confirmLabel="Delete Project"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
