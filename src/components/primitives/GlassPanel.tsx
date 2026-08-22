"use client";

/**
 * The single entry point to the glass material system.
 *
 * Choose `level` by the surface's ROLE, never by how much emphasis you want:
 *   1 — navigation, chips, small controls, secondary surfaces
 *   2 — project cards, skill containers, information panels
 *   3 — featured or important interactive components (use sparingly)
 *
 * Add-ons:
 *   `sheen`       pointer-tracking specular highlight (auto-disabled on touch
 *                 and under reduced motion, via `usePointerSurface`)
 *   `rim`         bright refraction edge along the top — sells pane thickness
 *   `interactive` hover lift + brighter border; also applies on `:focus-within`
 */

import { createElement, type ReactNode } from "react";
import { usePointerSurface } from "@/lib/hooks";
import { cn } from "@/lib/cn";

type PanelTag =
  | "div"
  | "article"
  | "section"
  | "aside"
  | "li"
  | "nav"
  | "header"
  | "footer";

export interface GlassPanelProps {
  children: ReactNode;
  level?: 1 | 2 | 3;
  sheen?: boolean;
  rim?: boolean;
  interactive?: boolean;
  className?: string;
  as?: PanelTag;
  /** Forwarded so parents can label or identify the surface. */
  id?: string;
  role?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  style?: React.CSSProperties;
}

const LEVEL_CLASS = {
  1: "glass-1",
  2: "glass-2",
  3: "glass-3",
} as const;

export function GlassPanel({
  children,
  level = 2,
  sheen = false,
  rim = false,
  interactive = false,
  className,
  as = "div",
  ...rest
}: GlassPanelProps) {
  // The hook no-ops on coarse pointers and under reduced motion, so attaching
  // the ref unconditionally costs nothing.
  const ref = usePointerSurface<HTMLElement>();

  return createElement(
    as,
    {
      ref: sheen ? ref : undefined,
      className: cn(
        LEVEL_CLASS[level],
        sheen && "glass-sheen",
        rim && "glass-rim",
        interactive && "glass-interactive",
        className,
      ),
      ...rest,
    },
    children,
  );
}
