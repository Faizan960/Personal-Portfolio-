"use client";

import Link from "next/link";
import { ENTITY_TYPE_LABELS, type CityGraph, type CityNode } from "@/lib/city/types";
import { getHighlightChain } from "@/lib/city/cityRenderer";
import { REPO_LABELS, STATUS_LABELS, type RepoPresentation } from "@/lib/project";
import { cn } from "@/lib/cn";

interface CityInfoPanelProps {
  node: CityNode | null;
  graph: CityGraph;
  onSelectNode: (id: string) => void;
  onClose: () => void;
}

export function CityInfoPanel({
  node,
  graph,
  onSelectNode,
  onClose,
}: CityInfoPanelProps) {
  if (!node) return null;

  const chainIds = Array.from(getHighlightChain(node.id, graph));
  const relatedNodes = chainIds
    .filter((id) => id !== node.id)
    .map((id) => graph.nodeMap.get(id))
    .filter((n): n is CityNode => Boolean(n));

  const grouped = {
    district: relatedNodes.filter((n) => n.type === "district"),
    skill: relatedNodes.filter((n) => n.type === "skill"),
    project: relatedNodes.filter((n) => n.type === "project"),
    technology: relatedNodes.filter((n) => n.type === "technology"),
  };

  const repoPresentation: RepoPresentation = (() => {
    if (node.type !== "project") return { kind: "none" };
    switch (node.metadata.visibility ?? "unknown") {
      case "public":
        return node.metadata.githubUrl
          ? { kind: "link", href: node.metadata.githubUrl, label: REPO_LABELS.public }
          : { kind: "none" };
      case "private":
        return { kind: "label", label: REPO_LABELS.private };
      case "development":
        return { kind: "label", label: REPO_LABELS.development };
      default:
        return { kind: "none" };
    }
  })();

  const statusText =
    node.type === "project" && node.metadata.status
      ? STATUS_LABELS[node.metadata.status]
      : null;

  return (
    <aside
      aria-live="polite"
      aria-label={`${node.label} details`}
      className={cn(
        "absolute z-30 transition-all duration-300",
        // Desktop & Tablet: compact right drawer preserving city visibility
        "md:left-auto md:right-5 md:top-5 md:bottom-5 md:w-[330px] md:max-h-none md:overflow-y-auto md:p-5",
        // Mobile: compact bottom drawer keeping city visible
        "inset-x-3 bottom-3 max-h-[42vh] overflow-y-auto p-4",
        "rounded-2xl border border-white/15 bg-[#080e20]/90 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl"
      )}
      style={{ borderTopWidth: "2px", borderTopColor: node.accentHex }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className="inline-block font-mono text-[11px] uppercase tracking-[0.14em]"
            style={{ color: node.accentHex }}
          >
            {ENTITY_TYPE_LABELS[node.type]}
          </span>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">
            {node.label}
          </h3>
          {node.subtitle && (
            <p className="mt-0.5 text-xs text-zinc-400">{node.subtitle}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          title="Close (Esc)"
          className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Metadata Badges (Honest status & facts only) */}
      {(statusText || (node.type === "hq" && node.metadata.location)) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {statusText && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 font-mono text-[11px] text-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              {statusText}
            </span>
          )}
          {node.type === "hq" && node.metadata.location && (
            <span className="inline-flex items-center rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-0.5 font-mono text-[11px] text-sky-200">
              {node.metadata.location}
            </span>
          )}
        </div>
      )}

      {/* Concise Description */}
      {node.description && (
        <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-zinc-300">
          {node.description}
        </p>
      )}

      {/* Skill verification note */}
      {node.type === "skill" && (
        <p className="mt-2 font-mono text-[11px] text-zinc-400">
          {node.metadata.projectCount && node.metadata.projectCount > 0
            ? `${node.metadata.projectCount} verified project relationship${node.metadata.projectCount === 1 ? "" : "s"}`
            : "No verified project links recorded yet"}
        </p>
      )}

      {/* Grouped Ecosystem Connections */}
      <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
        {grouped.district.length > 0 && (
          <ConnectionGroup
            title="Domains"
            items={grouped.district}
            onSelectNode={onSelectNode}
          />
        )}
        {grouped.skill.length > 0 && (
          <ConnectionGroup
            title="Skills"
            items={grouped.skill}
            onSelectNode={onSelectNode}
          />
        )}
        {grouped.project.length > 0 && (
          <ConnectionGroup
            title="Projects"
            items={grouped.project}
            onSelectNode={onSelectNode}
          />
        )}
        {grouped.technology.length > 0 && (
          <ConnectionGroup
            title="Technologies"
            items={grouped.technology}
            onSelectNode={onSelectNode}
          />
        )}
      </div>

      {/* Navigation & Repository Actions */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          {node.metadata.detailHref && (
            node.metadata.detailHref.startsWith("#") ? (
              <a
                href={node.metadata.detailHref}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/35 bg-sky-500/15 px-3 py-1.5 text-white transition-colors hover:border-sky-300 hover:bg-sky-500/25"
              >
                <span>View Section</span>
                <span aria-hidden="true">↓</span>
              </a>
            ) : (
              <Link
                href={node.metadata.detailHref}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-amber-100 transition-colors hover:border-amber-200 hover:bg-amber-400/25"
              >
                <span>View Case Study</span>
                <span aria-hidden="true">→</span>
              </Link>
            )
          )}

          {repoPresentation.kind === "link" && (
            <a
              href={repoPresentation.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/10"
            >
              <span>GitHub</span>
              <span aria-hidden="true">↗</span>
            </a>
          )}

          {repoPresentation.kind === "label" && (
            <span className="text-[11px] text-zinc-400">{repoPresentation.label}</span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-[11px] text-zinc-400 underline hover:text-zinc-200"
        >
          Reset View
        </button>
      </div>
    </aside>
  );
}

function ConnectionGroup({
  title,
  items,
  onSelectNode,
}: {
  title: string;
  items: CityNode[];
  onSelectNode: (id: string) => void;
}) {
  return (
    <div>
      <h4 className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
        {title} · {items.length}
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectNode(item.id)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-[#0f1a36]/80 px-2.5 py-1 text-[11px] text-zinc-200 transition-colors hover:border-sky-400/50 hover:bg-sky-500/20 hover:text-white"
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.accentHex }}
            />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
