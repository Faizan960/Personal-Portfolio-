"use client";

import React, { useState } from "react";
import { cn } from "@/lib/cn";

export interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({
  tags,
  onChange,
  placeholder = "Type tag and press Enter...",
  className,
}: TagInputProps) {
  const [inputVal, setInputVal] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !inputVal && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputVal("");
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-[var(--radius-control)] border p-2",
        "bg-[var(--color-surface-2)] border-[var(--hairline)] focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)]",
        className
      )}
    >
      {tags.map((tag, idx) => (
        <span
          key={`${tag}-${idx}`}
          className="inline-flex items-center gap-1 rounded-[var(--radius-chip)] bg-[var(--color-surface-3)] border border-[var(--hairline)] px-2.5 py-0.5 text-micro text-[var(--color-text)]"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(idx)}
            className="text-[var(--color-subtle)] hover:text-red-400 focus:outline-none"
            aria-label={`Remove ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? placeholder : "Add more..."}
        className="min-w-[120px] flex-1 bg-transparent text-small text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none px-1"
      />
    </div>
  );
}
