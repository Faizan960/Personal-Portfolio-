"use client";

import React, { useState, useMemo } from "react";
import { usePortfolioDraft } from "@/lib/cms/context";
import type {
  CityEntityKind,
  CityRelationshipKind,
  TechCityCustomEdge,
} from "@/lib/cms/types";
import {
  TechCityStudioShell,
  getCityConfig,
  makeSkillSlugId,
  resolveEntityDisplayName,
} from "@/components/admin/tech-city/TechCityStudioShell";

const RELATIONSHIP_LABELS: { value: CityRelationshipKind; label: string }[] = [
  { value: "uses", label: "uses" },
  { value: "demonstrates", label: "demonstrates" },
  { value: "built-with", label: "built with" },
  { value: "relevant-to", label: "is relevant to" },
  { value: "integrates", label: "integrates with" },
  { value: "supports", label: "supports" },
  { value: "extends", label: "extends" },
];

export default function TechCityConnectionsPage() {
  const { draft, saveCityConfigAndSync } = usePortfolioDraft();
  const cityConfig = getCityConfig(draft);

  const entityOptions = useMemo(() => {
    const list: { key: string; type: CityEntityKind; id: string; label: string }[] = [
      {
        key: "core:identity",
        type: "core",
        id: "identity",
        label: `Central HQ — ${cityConfig.appearance.coreLabel || draft.personal.name}`,
      },
    ];
    for (const cat of draft.skills) {
      list.push({
        key: `category:${cat.id}`,
        type: "category",
        id: cat.id,
        label: `District — ${cat.label}`,
      });
      for (const skill of cat.items) {
        const sid = makeSkillSlugId(cat.id, skill);
        list.push({
          key: `skill:${sid}`,
          type: "skill",
          id: sid,
          label: `Building — ${skill} (${cat.label})`,
        });
      }
    }
    for (const proj of draft.projects) {
      list.push({
        key: `project:${proj.id}`,
        type: "project",
        id: proj.id,
        label: `Landmark — ${proj.name}`,
      });
    }
    for (const tech of draft.technologies ?? []) {
      list.push({
        key: `technology:${tech.id}`,
        type: "technology",
        id: tech.id,
        label: `Technology — ${tech.name}`,
      });
    }
    return list;
  }, [draft, cityConfig.appearance.coreLabel]);

  const [sourceKey, setSourceKey] = useState(entityOptions[0]?.key ?? "core:identity");
  const [targetKey, setTargetKey] = useState(
    entityOptions.find((o) => o.type === "project")?.key ?? entityOptions[1]?.key ?? "",
  );
  const [relationship, setRelationship] =
    useState<CityRelationshipKind>("integrates");
  const [strength, setStrength] = useState(0.8);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const source = entityOptions.find((o) => o.key === sourceKey);
    const target = entityOptions.find((o) => o.key === targetKey);
    if (!source || !target) return;

    if (source.type === target.type && source.id === target.id) {
      setErrorMsg("An item cannot be connected to itself.");
      return;
    }

    const duplicate = cityConfig.customEdges.some(
      (edge) =>
        edge.sourceType === source.type &&
        edge.sourceId === source.id &&
        edge.targetType === target.type &&
        edge.targetId === target.id &&
        edge.relationshipType === relationship,
    );
    if (duplicate) {
      setErrorMsg("This exact connection already exists in your city.");
      return;
    }

    const newEdge: TechCityCustomEdge = {
      id: `edge-${Date.now().toString(36)}`,
      sourceType: source.type,
      sourceId: source.id,
      targetType: target.type,
      targetId: target.id,
      relationshipType: relationship,
      strength,
      isVisible: true,
    };

    const res = await saveCityConfigAndSync({
      ...cityConfig,
      customEdges: [...cityConfig.customEdges, newEdge],
    });
    if (res.success) {
      notify(
        `Added connection: ${resolveEntityDisplayName(draft, source.type, source.id)} ${relationship} ${resolveEntityDisplayName(draft, target.type, target.id)}.`,
      );
    }
  };

  const handleToggleEdge = async (edge: TechCityCustomEdge) => {
    const res = await saveCityConfigAndSync({
      ...cityConfig,
      customEdges: cityConfig.customEdges.map((item) =>
        item.id === edge.id ? { ...item, isVisible: !item.isVisible } : item,
      ),
    });
    if (res.success) {
      notify(edge.isVisible ? "Connection hidden." : "Connection enabled.");
    }
  };

  const handleDeleteEdge = async (id: string) => {
    const res = await saveCityConfigAndSync({
      ...cityConfig,
      customEdges: cityConfig.customEdges.filter((item) => item.id !== id),
    });
    if (res.success) notify("Custom connection removed.");
  };

  return (
    <TechCityStudioShell
      title="City Connections & Energy Lines"
      description="Verified skill links and project technologies create connections automatically. Add or hide custom architectural links here without writing code."
      activeHref="/admin/tech-city/connections/"
      toast={toast}
    >
      {/* Automatic verified summary */}
      <div className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-4 text-small text-[var(--color-muted)]">
        Automatic connections active:{" "}
        <strong className="text-[var(--color-text)]">
          {draft.skills.length} districts
        </strong>{" "}
        linked to HQ ·{" "}
        <strong className="text-[var(--color-text)]">
          {draft.skills.reduce((a, s) => a + s.items.length, 0)} buildings
        </strong>{" "}
        placed in districts ·{" "}
        <strong className="text-[var(--color-text)]">
          {draft.projects.reduce(
            (a, p) => a + (p.skillIds?.length ?? 0) + p.tech.length,
            0,
          )}{" "}
          verified project links
        </strong>
        .
      </div>

      {errorMsg && (
        <div className="rounded-[var(--radius-panel)] border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-small text-red-200">
          {errorMsg}
        </div>
      )}

      {/* Add custom link */}
      <form
        onSubmit={handleAddConnection}
        className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] p-5 space-y-4"
      >
        <h3 className="text-h4 font-medium text-[var(--color-text)]">
          Create Curated Connection
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-micro text-[var(--color-subtle)]">
            <span>From Item</span>
            <select
              value={sourceKey}
              onChange={(e) => setSourceKey(e.target.value)}
              className="w-full rounded border border-[var(--hairline)] bg-[var(--color-surface-2)] px-2.5 py-2 text-small text-[var(--color-text)] outline-none"
            >
              {entityOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-micro text-[var(--color-subtle)]">
            <span>Relationship</span>
            <select
              value={relationship}
              onChange={(e) =>
                setRelationship(e.target.value as CityRelationshipKind)
              }
              className="w-full rounded border border-[var(--hairline)] bg-[var(--color-surface-2)] px-2.5 py-2 text-small text-[var(--color-text)] outline-none"
            >
              {RELATIONSHIP_LABELS.map((rel) => (
                <option key={rel.value} value={rel.value}>
                  {rel.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-micro text-[var(--color-subtle)]">
            <span>To Item</span>
            <select
              value={targetKey}
              onChange={(e) => setTargetKey(e.target.value)}
              className="w-full rounded border border-[var(--hairline)] bg-[var(--color-surface-2)] px-2.5 py-2 text-small text-[var(--color-text)] outline-none"
            >
              {entityOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-micro text-[var(--color-subtle)]">
            <span>Signal Brightness ({Math.round(strength * 100)}%)</span>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.1"
                value={strength}
                onChange={(e) => setStrength(Number(e.target.value))}
                className="flex-1"
              />
              <button
                type="submit"
                className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-3.5 py-1.5 text-small font-medium text-[var(--color-void)] hover:opacity-90 shrink-0"
              >
                + Connect
              </button>
            </div>
          </label>
        </div>
      </form>

      {/* Existing custom links */}
      <div className="space-y-2.5">
        {cityConfig.customEdges.length === 0 ? (
          <div className="glass-2 rounded-[var(--radius-panel)] border border-dashed border-[var(--hairline)] p-6 text-center text-small text-[var(--color-subtle)]">
            No custom connections added yet. Automatic relationships from your Skills and Projects already power the city grid.
          </div>
        ) : (
          cityConfig.customEdges.map((edge) => {
            const fromLabel = resolveEntityDisplayName(
              draft,
              edge.sourceType,
              edge.sourceId,
            );
            const toLabel = resolveEntityDisplayName(
              draft,
              edge.targetType,
              edge.targetId,
            );
            return (
              <div
                key={edge.id}
                className="glass-2 rounded-[var(--radius-panel)] border border-[var(--hairline)] px-4 py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-small">
                  <span className="font-medium text-[var(--color-text)]">
                    {fromLabel}
                  </span>
                  <span className="rounded bg-[var(--color-surface-3)] px-2 py-0.5 font-mono text-micro text-[var(--color-accent)]">
                    {edge.relationshipType}
                  </span>
                  <span className="font-medium text-[var(--color-text)]">
                    {toLabel}
                  </span>
                  <span className="font-mono text-micro text-[var(--color-faint)]">
                    ({Math.round(edge.strength * 100)}%)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleToggleEdge(edge)}
                    className={`rounded-full px-2.5 py-0.5 text-micro font-medium ${
                      edge.isVisible
                        ? "bg-[var(--color-live)]/15 text-[var(--color-live)]"
                        : "bg-[var(--color-surface-3)] text-[var(--color-faint)]"
                    }`}
                  >
                    {edge.isVisible ? "Visible" : "Hidden"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteEdge(edge.id)}
                    className="p-1 text-red-400 hover:text-red-300"
                    title="Remove connection"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </TechCityStudioShell>
  );
}
