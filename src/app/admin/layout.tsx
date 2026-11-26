"use client";

/**
 * Admin root layout
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides the AdminShell (sidebar + topbar) for all /admin/* routes.
 * This layout is nested inside the root layout. Because PublicChrome detects
 * /admin/* and passes children through unwrapped, this layout takes full
 * control of the viewport — no public navigation or footer is rendered.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { AdminShell } from "@/components/admin/AdminShell";
import { PortfolioDraftProvider } from "@/lib/cms/context";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortfolioDraftProvider>
      <AdminShell>{children}</AdminShell>
    </PortfolioDraftProvider>
  );
}
