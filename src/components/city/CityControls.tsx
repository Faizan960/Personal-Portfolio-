"use client";

import { useMemo, useState } from "react";
import { ENTITY_TYPE_COLORS, ENTITY_TYPE_LABELS, type CityGraph, type CityNode } from "@/lib/city/types";
import { cn } from "@/lib/cn";

interface CityControlsProps {
  graph: CityGraph;
  selectedId: string | null;
  hoveredNode: CityNode | null;
  tourActive: boolean;
  onSelectNode: (id: string | null) => void;
  onToggleTour: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export function CityControls({
  graph,
  selectedId,
  hoveredNode,
  tourActive,
  onSelectNode,
  onToggleTour,
  onZoomIn,
  onZoomOut,
  onResetView,
}: CityControlsProps) {
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return graph.nodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          ENTITY_TYPE_LABELS[n.type].toLowerCase().includes(q) ||
          (n.subtitle && n.subtitle.toLowerCase().includes(q))
      )
      .slice(0, 7);
  }, [graph.nodes, query]);

  const handleSelectSearch = (node: CityNode) => {
    onSelectNode(node.id);
    setQuery(node.label);
    setSearchFocused(false);
  };

  return (
    <>
      {/* Top-Left Tools: Search + Tour + Legend */}
      <div
        className={cn(
          "absolute left-3 top-3 z-20 flex w-[calc(100%-1.5rem)] max-w-[240px] flex-col gap-2 sm:left-5 sm:top-5",
          selectedId && "hidden md:flex"
        )}
      >
        <div className="relative">
          <input
            type="search"
            value={query}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              if (!val.trim()) {
                onSelectNode(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchResults[0]) {
                e.preventDefault();
                handleSelectSearch(searchResults[0]);
              }
            }}
            placeholder="Find domain, skill, project, tech…"
            aria-label="Search Tech City entities"
            autoComplete="off"
            className="w-full rounded-xl border border-[#26365a] bg-[#0a1226]/85 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-400 backdrop-blur-md transition-colors focus:border-sky-400 focus:outline-none"
          />

          {/* Search dropdown operating directly on graph records */}
          {searchFocused && searchResults.length > 0 && (
            <ul
              role="listbox"
              aria-label="Search matches"
              className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-[#26365a] bg-[#080e20]/95 shadow-2xl backdrop-blur-xl"
            >
              {searchResults.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSearch(item);
                    }}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs text-zinc-200 transition-colors hover:bg-sky-500/20 hover:text-white"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.accentHex }}
                      />
                      <span className="truncate font-medium">{item.label}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] uppercase text-zinc-400">
                      {item.type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleTour}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium backdrop-blur-md transition-all cursor-pointer",
            tourActive
              ? "border-sky-400 bg-sky-500/25 text-white"
              : "border-[#3a4f86] bg-gradient-to-r from-[#1b2a5a]/80 to-[#0f3a4f]/80 text-zinc-100 hover:border-sky-400"
          )}
        >
          <span aria-hidden="true">{tourActive ? "■" : "▶"}</span>
          <span>{tourActive ? "Stop Project Tour" : "Take Project Tour"}</span>
        </button>

        {/* Legend (desktop/tablet) */}
        <div className="hidden gap-1.5 rounded-xl border border-[#1b2745] bg-[#0a1226]/75 px-3 py-2.5 text-[11px] text-zinc-300 backdrop-blur-md md:grid">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: ENTITY_TYPE_COLORS.hq.hex }}
            />
            <span>Central HQ (Identity)</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: ENTITY_TYPE_COLORS.district.hex }}
            />
            <span>Domain District</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: ENTITY_TYPE_COLORS.skill.hex }}
            />
            <span>Skill Tower (height = projects)</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: ENTITY_TYPE_COLORS.project.hex }}
            />
            <span>Floating Project Landmark</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: ENTITY_TYPE_COLORS.technology.hex }}
            />
            <span>Technology Satellite</span>
          </div>
        </div>
      </div>

      {/* Hover Tooltip Pill */}
      {hoveredNode && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-white/15 bg-[#080e20]/85 px-3.5 py-1.5 text-xs text-white shadow-lg backdrop-blur-md">
          <span
            className="mr-2 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: hoveredNode.accentHex }}
          />
          <span className="font-medium">{hoveredNode.label}</span>
          <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
            {ENTITY_TYPE_LABELS[hoveredNode.type]}
          </span>
        </div>
      )}

      {/* Bottom-Left Camera Navigation Controls */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 sm:bottom-5 sm:left-5">
        <button
          type="button"
          onClick={onZoomIn}
          aria-label="Zoom in"
          title="Zoom in"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-[#0a1226]/80 text-sm text-zinc-200 backdrop-blur-md transition-colors hover:border-sky-400 hover:text-white"
        >
          +
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          aria-label="Zoom out"
          title="Zoom out"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-[#0a1226]/80 text-sm text-zinc-200 backdrop-blur-md transition-colors hover:border-sky-400 hover:text-white"
        >
          −
        </button>
        <button
          type="button"
          onClick={onResetView}
          className="cursor-pointer rounded-lg border border-white/15 bg-[#0a1226]/80 px-2.5 py-1.5 font-mono text-[11px] text-zinc-200 backdrop-blur-md transition-colors hover:border-sky-400 hover:text-white"
        >
          {selectedId ? "Overview" : "Reset"}
        </button>
      </div>

      {/* Bottom Interaction Hint (Desktop) */}
      {!selectedId && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 font-mono text-[11px] tracking-wide text-zinc-400 lg:block">
          Drag to orbit · Scroll or pinch to zoom · Click any building, landmark or satellite
        </div>
      )}
    </>
  );
}
