/**
 * Login layout — overrides the admin shell layout for /admin/login.
 *
 * The login page is full-viewport with no sidebar or topbar. A user who is
 * not yet authenticated must not see the admin navigation chrome.
 *
 * Next.js nested layouts: this layout sits inside the admin layout
 * (src/app/admin/layout.tsx). We need to bypass AdminShell here.
 *
 * Strategy: AdminShell renders children inside its main content area.
 * The login page has its own full-screen div that fills the content area
 * and uses `h-full` to fill it. The sidebar and topbar remain in the DOM
 * on the admin layout level, but the login page itself provides a visual
 * full-screen overlay using fixed positioning.
 *
 * To fully suppress the admin shell on login, we restructure: the login
 * route uses its own layout that returns children directly, and the parent
 * admin layout checks for /admin/login via a client wrapper.
 *
 * Simplest correct approach: since Next.js nested layouts always render
 * top-down, we cannot skip a parent layout. Instead, the login page uses
 * position:fixed to visually cover the admin shell entirely.
 */

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
