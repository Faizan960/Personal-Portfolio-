/**
 * Builds the canonical password-reset callback URL for the current origin.
 * Always includes the trailing slash required by Next.js static export (`trailingSlash: true`).
 */
export function buildPasswordResetRedirectUrl(origin?: string): string {
  const resolvedOrigin =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const cleanOrigin = resolvedOrigin.replace(/\/+$/, "");
  return cleanOrigin
    ? `${cleanOrigin}/admin/reset-password/`
    : "/admin/reset-password/";
}
