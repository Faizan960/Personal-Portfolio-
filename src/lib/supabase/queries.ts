/**
 * Supabase Query Helpers & Human-Readable Error Translation
 * ─────────────────────────────────────────────────────────────────────────────
 * Never exposes raw PostgreSQL constraint codes or technical internals to
 * ordinary CMS administrators.
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

export function translateDatabaseError(err: unknown, context?: string): string {
  if (!err) return "An unexpected error occurred. Your local backup is preserved.";

  const pgErr = err as PostgrestLikeError;
  const code = pgErr.code || "";
  const msg = (pgErr.message || String(err)).toLowerCase();

  if (code === "23505" || msg.includes("duplicate key") || msg.includes("unique")) {
    return context
      ? `A record with this identifier already exists in ${context}. Choose a unique name or slug.`
      : "An item with this identifier already exists. Please use a unique name or identifier.";
  }

  if (code === "23503" || msg.includes("foreign key")) {
    return "This item is still connected to another project or experience entry. Remove those connections first.";
  }

  if (code === "23502" || msg.includes("not-null") || msg.includes("null value")) {
    return "Some required information is missing. Please fill in all required fields and try again.";
  }

  if (code === "23514" || msg.includes("check constraint")) {
    return "One of the entered values is outside the permitted options. Review status, visibility, or link fields.";
  }

  if (
    code === "42501" ||
    msg.includes("permission denied") ||
    msg.includes("row-level security") ||
    msg.includes("unauthorized")
  ) {
    return "You do not have administrator permission for this change. Please sign in with an allowlisted admin account.";
  }

  if (code === "42P01" || code === "PGRST205" || msg.includes("does not exist")) {
    return "Database publishing tables are pending migration 008. Local draft saving remains active.";
  }

  if (msg.includes("payload too large") || msg.includes("size")) {
    return "This file is too large for upload.";
  }

  if (msg.includes("fetch") || msg.includes("network") || msg.includes("timeout")) {
    return "The database is temporarily unavailable. Your local backup is preserved.";
  }

  return pgErr.message
    ? `${context ? context + ": " : ""}${pgErr.message}`
    : "Changes could not be synced right now. Your local draft is preserved.";
}
