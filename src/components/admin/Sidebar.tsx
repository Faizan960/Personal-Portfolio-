"use client";

/**
 * Admin Sidebar
 * ─────────────────────────────────────────────────────────────────────────────
 * Desktop: collapsible fixed sidebar. Collapses to icon-only rail.
 * Mobile: rendered as a drawer, controlled by AdminShell.
 *
 * Uses the existing design token system and glass material for consistency
 * with the public portfolio aesthetic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { adminNavGroups, type NavItem } from "./navigation";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** On mobile, the sidebar is in a drawer; this closes it. */
  onClose?: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "flex h-full flex-col",
        "bg-[var(--color-surface-1)] border-r border-[var(--hairline)]",
        "transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-spatial)]",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* ── Brand ──────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-[var(--hairline)]",
          collapsed ? "justify-center px-0" : "gap-3 px-4",
        )}
      >
        {/* Logo mark */}
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-chip)] bg-[var(--color-accent)] text-[var(--color-void)]"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-small font-medium text-[var(--color-text)]">
              Portfolio CMS
            </p>
            <p className="truncate font-mono text-micro text-[var(--color-subtle)]">
              Admin workspace
            </p>
          </div>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav
        aria-label="Admin navigation"
        className="flex-1 overflow-y-auto overflow-x-hidden py-3"
      >
        {adminNavGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <p
                className="kicker kicker-muted px-4 pb-1.5 pt-3"
                aria-hidden="true"
              >
                {group.label}
              </p>
            )}

            <ul role="list">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                  onClick={onClose}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Footer actions ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[var(--hairline)] py-3">
        {/* View portfolio */}
        <SidebarAction
          label="View Portfolio"
          collapsed={collapsed}
          href="/"
          external
          iconPath="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
        />

        {/* Collapse toggle — desktop only */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "hidden w-full items-center gap-3 rounded-[var(--radius-chip)] px-3 py-2 text-small",
            "text-[var(--color-subtle)] transition-colors duration-[var(--dur-fast)]",
            "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-muted)]",
            "focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]",
            collapsed ? "justify-center" : "",
            "lg:flex",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              "size-4 shrink-0 transition-transform duration-[var(--dur-slow)]",
              collapsed ? "rotate-180" : "",
            )}
            aria-hidden="true"
          >
            <path d="M11.25 9l-3 3m0 0l3 3m-3-3h7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {!collapsed && (
            <span className="text-small">Collapse</span>
          )}
        </button>
      </div>
    </aside>
  );
}

/* ── SidebarItem ─────────────────────────────────────────────────────────── */

interface SidebarItemProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

function SidebarItem({ item, active, collapsed, onClick }: SidebarItemProps) {
  return (
    <li>
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-[var(--radius-chip)] mx-2 px-2.5 py-2 text-small",
          "transition-colors duration-[var(--dur-fast)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]",
          collapsed ? "justify-center" : "",
          active
            ? "bg-[var(--color-surface-3)] text-[var(--color-text)]"
            : "text-[var(--color-subtle)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-muted)]",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "size-4 shrink-0",
            active
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-faint)] group-hover:text-[var(--color-subtle)]",
          )}
          aria-hidden="true"
        >
          <path d={item.iconPath} />
        </svg>

        {!collapsed && (
          <span className="truncate">{item.label}</span>
        )}

        {active && !collapsed && (
          <span
            aria-hidden="true"
            className="ml-auto size-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
          />
        )}
      </Link>
    </li>
  );
}

/* ── SidebarAction ───────────────────────────────────────────────────────── */

interface SidebarActionProps {
  label: string;
  collapsed: boolean;
  href?: string;
  external?: boolean;
  iconPath: string;
  onClick?: () => void;
  variant?: "default" | "danger";
}

function SidebarAction({
  label,
  collapsed,
  href,
  external,
  iconPath,
  onClick,
  variant = "default",
}: SidebarActionProps) {
  const className = cn(
    "flex w-full items-center gap-3 rounded-[var(--radius-chip)] mx-2 px-2.5 py-2 text-small",
    "transition-colors duration-[var(--dur-fast)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]",
    collapsed ? "justify-center" : "",
    variant === "danger"
      ? "text-red-400 hover:bg-red-900/20 hover:text-red-300"
      : "text-[var(--color-subtle)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-muted)]",
  );

  const icon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
      aria-hidden="true"
    >
      <path d={iconPath} />
    </svg>
  );

  if (href) {
    return (
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        title={collapsed ? label : undefined}
        className={className}
      >
        {icon}
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && external && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-auto size-3 shrink-0 text-[var(--color-faint)]"
            aria-hidden="true"
          >
            <path d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
          </svg>
        )}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={className}
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}
