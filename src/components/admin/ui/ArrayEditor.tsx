"use client";

import React, { useState } from "react";
import { cn } from "@/lib/cn";

export interface ArrayEditorProps {
  items: string[];
  onChange: (items: string[]) => void;
  itemPlaceholder?: string;
  addLabel?: string;
  className?: string;
}

export function ArrayEditor({
  items,
  onChange,
  itemPlaceholder = "Enter item text...",
  addLabel = "+ Add item",
  className,
}: ArrayEditorProps) {
  const [newItem, setNewItem] = useState("");

  const handleAdd = () => {
    if (!newItem.trim()) return;
    onChange([...items, newItem.trim()]);
    setNewItem("");
  };

  const handleUpdate = (index: number, val: string) => {
    const updated = [...items];
    updated[index] = val;
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const copy = [...items];
    const [moved] = copy.splice(index, 1);
    if (moved !== undefined) {
      copy.splice(targetIdx, 0, moved);
      onChange(copy);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="font-mono text-micro text-[var(--color-faint)] w-5 text-right shrink-0">
            {idx + 1}.
          </span>
          <input
            type="text"
            value={item}
            onChange={(e) => handleUpdate(idx, e.target.value)}
            placeholder={itemPlaceholder}
            className="flex-1 rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-3 py-1.5 text-small text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
          />
          <button
            type="button"
            onClick={() => handleMove(idx, "up")}
            disabled={idx === 0}
            title="Move up"
            className="p-1 text-[var(--color-subtle)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => handleMove(idx, "down")}
            disabled={idx === items.length - 1}
            title="Move down"
            className="p-1 text-[var(--color-subtle)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => handleRemove(idx)}
            title="Remove item"
            className="p-1 text-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          placeholder={itemPlaceholder}
          className="flex-1 rounded-[var(--radius-control)] border border-[var(--hairline-faint)] bg-[var(--color-surface-1)] px-3 py-1.5 text-small text-[var(--color-text)] placeholder:text-[var(--color-faint)] focus:border-[var(--color-accent)] outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-3 py-1.5 text-small font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-3)] transition-colors"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
