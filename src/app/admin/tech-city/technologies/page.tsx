"use client";

import React, { useState, useMemo } from "react";
import { usePortfolioDraft } from "@/lib/cms/context";
import type { MutableTechnology } from "@/lib/cms/types";
import { TechCityStudioShell } from "@/components/admin/tech-city/TechCityStudioShell";
import { TextInput } from "@/components/admin/ui/TextInput";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";

export default function TechCityTechnologiesPage() {
  const { draft, saveTechnologyAndSync, deleteTechnologyAndSync } =
    usePortfolioDraft();
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("#38bdf8");
  const [deleteTarget, setDeleteTarget] = useState<MutableTechnology | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);

  const technologies = useMemo(
    () => draft.technologies ?? [],
    [draft.technologies],
  );

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredTech = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return technologies;
    return technologies.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
    );
  }, [technologies, search]);

  const countConnectedProjects = (tech: MutableTechnology) =>
    draft.projects.filter((p) =>
      p.tech.some(
        (name) =>
          name.toLowerCase() === tech.name.toLowerCase() ||
          name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === tech.normalizedName,
      ),
    ).length;

  const handleAddTech = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    const normalizedName = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const id = normalizedName || `tech-${Date.now().toString().slice(-4)}`;

    if (technologies.some((t) => t.id === id || t.normalizedName === normalizedName)) {
      notify(`Technology "${trimmed}" is already in the dictionary.`);
      return;
    }

    const res = await saveTechnologyAndSync({
      id,
      name: trimmed,
      normalizedName,
      colorOverride: newColor,
      isVisible: true,
      description: newDesc.trim() ? newDesc.trim() : null,
    });
    if (res.success) {
      setNewName("");
      setNewDesc("");
      notify(`Added technology "${trimmed}".`);
    }
  };

  const handleUpdateTech = async (
    tech: MutableTechnology,
    patch: Partial<MutableTechnology>,
    msg: string,
  ) => {
    const res = await saveTechnologyAndSync({ ...tech, ...patch });
    if (res.success) notify(msg);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await deleteTechnologyAndSync(deleteTarget.id);
    if (res.success) notify(`Deleted technology "${deleteTarget.name}".`);
    setDeleteTarget(null);
  };

  return (
    <TechCityStudioShell
      title="Technologies Dictionary"
      description="Canonical technologies used by your projects. Technologies orbit project landmarks inside Tech City without cluttering the Skills taxonomy."
      activeHref="/admin/tech-city/technologies/"
      toast={toast}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-4 flex items-end">
          <div className="w-full">
            <label className="block font-mono text-micro uppercase text-[var(--color-subtle)] mb-1">
              Search Technologies ({technologies.length})
            </label>
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by technology name..."
            />
          </div>
        </div>

        <form
          onSubmit={handleAddTech}
          className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-4 flex flex-wrap gap-2.5 items-end"
        >
          <div className="flex-1 min-w-[140px]">
            <label className="block font-mono text-micro uppercase text-[var(--color-subtle)] mb-1">
              Technology Name
            </label>
            <TextInput
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. FastAPI, Supabase..."
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block font-mono text-micro uppercase text-[var(--color-subtle)] mb-1">
              Short Note
            </label>
            <TextInput
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Optional role in stack..."
            />
          </div>
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            title="Node color"
            className="size-9 cursor-pointer rounded border border-[var(--hairline)] bg-transparent"
          />
          <button
            type="submit"
            className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90"
          >
            + Add Tech
          </button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filteredTech.map((tech) => {
          const connected = countConnectedProjects(tech);
          return (
            <div
              key={tech.id}
              className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1">
                  <input
                    type="color"
                    value={tech.colorOverride ?? "#38bdf8"}
                    onChange={(e) =>
                      void handleUpdateTech(
                        tech,
                        { colorOverride: e.target.value },
                        `Updated color for "${tech.name}".`,
                      )
                    }
                    className="size-7 cursor-pointer rounded border border-[var(--hairline)] bg-transparent"
                  />
                  <TextInput
                    value={tech.name}
                    onChange={(e) =>
                      void handleUpdateTech(
                        tech,
                        { name: e.target.value },
                        `Renamed "${tech.name}".`,
                      )
                    }
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      void handleUpdateTech(
                        tech,
                        { isVisible: !tech.isVisible },
                        tech.isVisible
                          ? `Hid "${tech.name}" in Tech City.`
                          : `Shown "${tech.name}" in Tech City.`,
                      )
                    }
                    className={`rounded-full px-2.5 py-0.5 text-micro font-medium ${
                      tech.isVisible
                        ? "bg-[var(--color-live)]/15 text-[var(--color-live)]"
                        : "bg-[var(--color-surface-3)] text-[var(--color-faint)]"
                    }`}
                  >
                    {tech.isVisible ? "Visible" : "Hidden"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(tech)}
                    className="p-1 text-red-400 hover:text-red-300"
                    title="Delete technology"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <TextInput
                  value={tech.description ?? ""}
                  onChange={(e) =>
                    void handleUpdateTech(
                      tech,
                      {
                        description: e.target.value.trim()
                          ? e.target.value
                          : null,
                      },
                      `Updated note for "${tech.name}".`,
                    )
                  }
                  placeholder="Optional technology note..."
                />
                <span className="font-mono text-micro text-[var(--color-subtle)] shrink-0">
                  {connected} project{connected === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Technology"
        description={`Remove "${deleteTarget?.name}" from the Tech City dictionary? Existing project badges keep their stored text unless removed on the project editor.`}
        confirmLabel="Delete Technology"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </TechCityStudioShell>
  );
}
