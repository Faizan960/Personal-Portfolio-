"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { allNavItems } from "./navigation";
import { usePortfolioDraft } from "@/lib/cms/context";

interface TopbarProps {
  onMenuOpen: () => void;
}

export function Topbar({ onMenuOpen }: TopbarProps) {
  const pathname = usePathname();
  const { adminUser, isAdminVerified, hasUnpublishedChanges } = usePortfolioDraft();

  // Pick longest matching nav href so /admin/tech-city/districts beats /admin/tech-city
  const currentItem = allNavItems
    .slice()
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  const pageTitle = currentItem?.label ?? "Admin";

  const avatarInitials = adminUser?.email
    ? adminUser.email.slice(0, 2).toUpperCase()
    : "FP";

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-4 border-b border-[var(--hairline)]",
        "bg-[var(--color-surface-1)] px-4"
      )}
    >
      <button
        type="button"
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
        className={cn(
          "flex size-8 items-center justify-center rounded-[var(--radius-chip)]",
          "text-[var(--color-subtle)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
          "transition-colors duration-[var(--dur-fast)] lg:hidden",
          "focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden="true"
        >
          <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="font-mono text-micro uppercase tracking-[0.16em] text-[var(--color-faint)]">
          Admin
        </span>
        {currentItem && (
          <>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3 shrink-0 text-[var(--color-faint)]"
              aria-hidden="true"
            >
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span
              className="truncate text-small font-medium text-[var(--color-text)]"
              aria-current="page"
            >
              {pageTitle}
            </span>
          </>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        {hasUnpublishedChanges && (
          <Link
            href="/admin/publishing/"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/10 px-3 py-1 font-mono text-micro text-amber-200 hover:bg-amber-400/20 transition-colors"
          >
            <span className="size-1.5 rounded-full bg-amber-300" />
            Publish Changes
          </Link>
        )}

        <StatusBadge />

        <Link
          href="/admin/account/"
          aria-label="Admin account"
          title={
            isAdminVerified && adminUser?.email
              ? `Signed in as ${adminUser.email}`
              : "Account & Sign In"
          }
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            "bg-[var(--color-surface-3)] border border-[var(--hairline)]",
            "font-mono text-micro text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors"
          )}
        >
          {avatarInitials}
        </Link>
      </div>
    </header>
  );
}

function StatusBadge() {
  const { persistenceSource, isAdminVerified } = usePortfolioDraft();

  if (persistenceSource === "supabase") {
    return (
      <div
        className={cn(
          "hidden items-center gap-1.5 rounded-full px-3 py-1 sm:flex",
          "bg-[var(--color-surface-2)] border border-[var(--color-accent-dim)]"
        )}
        title="Connected to Supabase PostgreSQL"
      >
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-[var(--color-live)] motion-safe:animate-pulse"
        />
        <span className="font-mono text-micro uppercase tracking-[0.1em] text-[var(--color-accent)]">
          {isAdminVerified ? "Live CMS" : "Connected"}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "hidden items-center gap-1.5 rounded-full px-3 py-1 sm:flex",
        "bg-[var(--color-surface-2)] border border-[var(--hairline)]"
      )}
      title="Local development draft mode"
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-[var(--color-accent-warm)]"
      />
      <span className="font-mono text-micro uppercase tracking-[0.1em] text-[var(--color-subtle)]">
        Local Draft
      </span>
    </div>
  );
}
