"use client";

/**
 * AdminShell
 * ─────────────────────────────────────────────────────────────────────────────
 * Root chrome for the admin interface. Manages:
 *   • Desktop sidebar collapse state (persisted in sessionStorage)
 *   • Mobile drawer open/close state
 *   • Escape key to close mobile drawer
 *   • Focus management for mobile drawer
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { usePortfolioDraft } from "@/lib/cms/context";
import { isSupabaseConfigured } from "@/lib/supabase/client";

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { authChecked, isAdminVerified } = usePortfolioDraft();
  const supabaseConfigured = isSupabaseConfigured();

  // All hooks called unconditionally before any early return.

  // Persist collapse state across navigations
  useEffect(() => {
    const stored = sessionStorage.getItem("admin-sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      sessionStorage.setItem("admin-sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // Escape closes mobile drawer; focus trap inside drawer
  useEffect(() => {
    if (!drawerOpen) return;

    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer();
        return;
      }
      if (e.key !== "Tab") return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusable = drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => {
      drawerRef.current?.querySelector<HTMLElement>("a[href], button")?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = prevOverflow;
    };
  }, [drawerOpen, closeDrawer]);

  // Auth pages render their own full-screen layout — no sidebar, topbar, or admin gate.
  const isAuthRoute =
    pathname === "/admin/login" ||
    pathname === "/admin/login/" ||
    pathname === "/admin/reset-password" ||
    pathname === "/admin/reset-password/";
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // Enforce verified administrator gate whenever Supabase Auth is configured
  if (supabaseConfigured && !authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-base)] text-small font-mono text-[var(--color-subtle)]">
        Verifying administrator session...
      </div>
    );
  }

  if (supabaseConfigured && authChecked && !isAdminVerified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-base)] px-4 text-center">
        <div className="glass-2 glass-rim max-w-md rounded-[var(--radius-card)] p-8 space-y-4">
          <p className="font-mono text-micro uppercase tracking-[0.16em] text-[var(--color-accent-warm)]">
            Administrator Access Required
          </p>
          <h1 className="text-h3 font-medium text-[var(--color-text)]">
            Sign in to Portfolio CMS
          </h1>
          <p className="text-small text-[var(--color-muted)]">
            This workspace is protected. Please sign in with an allowlisted administrator account to edit or publish portfolio content.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/admin/login/"
              className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-5 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90"
            >
              Go to Sign In
            </Link>
            <Link
              href="/"
              className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-4 py-2 text-small text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              Public Site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-base)]">
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* ── Mobile drawer ───────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[var(--z-overlay)] lg:hidden"
          aria-modal="true"
          role="dialog"
          aria-label="Navigation drawer"
        >
          {/* Scrim */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeDrawer}
            className="absolute inset-0 bg-[rgb(3_4_7/0.78)] backdrop-blur-sm"
          />

          {/* Drawer panel */}
          <div
            ref={drawerRef}
            className="absolute inset-y-0 left-0 flex w-64 flex-col shadow-[var(--shadow-lg)]"
          >
            <Sidebar
              collapsed={false}
              onToggleCollapse={() => {}}
              onClose={closeDrawer}
            />
          </div>
        </div>
      )}

      {/* ── Main content area ────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuOpen={() => setDrawerOpen(true)} />

        <main
          id="admin-main"
          className="flex-1 overflow-y-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
