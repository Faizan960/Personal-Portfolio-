"use client";

import { ENTITY_TYPE_LABELS, type CityGraph } from "@/lib/city/types";

interface CityAccessibleListProps {
  graph: CityGraph;
  webglUnavailable: boolean;
  onSelectNode: (id: string) => void;
}

export function CityAccessibleList({
  graph,
  webglUnavailable,
  onSelectNode,
}: CityAccessibleListProps) {
  return (
    <nav
      aria-label="Tech City entity directory"
      className={
        webglUnavailable
          ? "mt-4 rounded-xl border border-white/10 bg-[#080e20]/80 p-5"
          : "sr-only"
      }
    >
      <h3 className="text-sm font-medium text-white">
        {webglUnavailable
          ? "WebGL is unavailable in this browser. Explore the Tech City index below:"
          : "Tech City Entity Directory"}
      </h3>
      <ul className={webglUnavailable ? "mt-3 flex flex-wrap gap-2" : ""}>
        {graph.nodes.map((node) => {
          const neighborNames = Array.from(graph.adjacency.get(node.id) || [])
            .map((nid) => graph.nodeMap.get(nid)?.label)
            .filter(Boolean);

          return (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => onSelectNode(node.id)}
                className={
                  webglUnavailable
                    ? "rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 hover:border-sky-400"
                    : undefined
                }
              >
                {node.label} ({ENTITY_TYPE_LABELS[node.type]})
                {neighborNames.length > 0
                  ? ` — Connected to: ${neighborNames.join(", ")}`
                  : ""}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
