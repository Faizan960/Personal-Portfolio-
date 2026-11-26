"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-[rgb(3_4_7/0.8)] backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--hairline-strong)] bg-[var(--color-surface-1)] p-6 shadow-2xl space-y-4"
      >
        <div className="space-y-1">
          <h3 id="confirm-dialog-title" className="text-h4 font-medium text-[var(--color-text)]">
            {title}
          </h3>
          <p className="text-small text-[var(--color-muted)]">{description}</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-4 py-2 text-small text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "rounded-[var(--radius-control)] px-4 py-2 text-small font-medium transition-colors",
              variant === "danger"
                ? "bg-red-500/90 text-white hover:bg-red-600"
                : "bg-[var(--color-accent)] text-[var(--color-void)] hover:opacity-90"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
