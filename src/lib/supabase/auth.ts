import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "./client";

export interface AdminAuthResult {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  error?: string;
}

/**
 * Sign in an administrator with email and password.
 */
export async function signInAdmin(
  email: string,
  password: string,
): Promise<AdminAuthResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      user: null,
      session: null,
      isAdmin: false,
      error: "Supabase client is not configured.",
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      user: null,
      session: null,
      isAdmin: false,
      error: error?.message || "Authentication failed.",
    };
  }

  // Verify that authenticated user exists in the admin_users allowlist
  const isAdmin = await checkAdminAllowlist(data.user.id);
  if (!isAdmin) {
    await supabase.auth.signOut();
    return {
      user: null,
      session: null,
      isAdmin: false,
      error: "Unauthorized: User is not an allowlisted administrator.",
    };
  }

  return {
    user: data.user,
    session: data.session,
    isAdmin: true,
  };
}

/**
 * Sign out current administrator.
 */
export async function signOutAdmin(): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {};
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }
  return {};
}

/**
 * Get current session and verify active admin status.
 */
export async function getCurrentAdmin(): Promise<AdminAuthResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { user: null, session: null, isAdmin: false };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) {
    return { user: null, session: null, isAdmin: false };
  }

  const isAdmin = await checkAdminAllowlist(data.session.user.id);
  return {
    user: data.session.user,
    session: data.session,
    isAdmin,
  };
}

/**
 * Query admin_users allowlist for user id.
 */
export async function checkAdminAllowlist(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return Boolean(data.is_active);
  } catch {
    return false;
  }
}
