import React from "react";
import { cn } from "@/lib/cn";

export interface SaveIndicatorProps {
  isSaving?: boolean;
  isDirty?: boolean;
  lastSaved?: string | null;
  className?: string;
}

export function SaveIndicator({
  isSaving,
  isDirty,
  lastSaved,
  className,
}: SaveIndicatorProps) {
  return (
    <div className={cn("inline-flex items-center gap-2 font-mono text-micro", className)}>
      {isSaving ? (
        <>
          <span className="size-2 rounded-full bg-amber-400 motion-safe:animate-pulse" />
          <span className="text-amber-300">Saving draft...</span>
        </>
      ) : isDirty ? (
        <>
          <span className="size-2 rounded-full bg-amber-400" />
          <span className="text-amber-300">Unsaved changes</span>
        </>
      ) : (
        <>
          <span className="size-2 rounded-full bg-[var(--color-live)]" />
          <span className="text-[var(--color-subtle)]">
            Saved {lastSaved ? `(${new Date(lastSaved).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})` : "locally"}
          </span>
        </>
      )}
    </div>
  );
}
