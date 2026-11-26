import React from "react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  emptyMessage = "No records found.",
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="glass-well rounded-[var(--radius-panel)] p-8 text-center text-small text-[var(--color-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-[var(--radius-panel)] border border-[var(--hairline)]", className)}>
      <table className="w-full text-left text-small">
        <thead className="bg-[var(--color-surface-2)] text-micro font-mono uppercase tracking-[0.14em] text-[var(--color-subtle)] border-b border-[var(--hairline)]">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={cn("px-4 py-3 font-medium", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--hairline-faint)] bg-[var(--color-surface-1)]">
          {data.map((item) => (
            <tr
              key={String(item[keyField])}
              className="hover:bg-[var(--color-surface-2)]/60 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3 align-middle text-[var(--color-text)]", col.className)}>
                  {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
