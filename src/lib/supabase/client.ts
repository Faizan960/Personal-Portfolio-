import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Checks whether Supabase URL and Publishable Key are configured in Vercel environment.
 * Evaluates process.env.NEXT_PUBLIC_SUPABASE_URL and process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return Boolean(url && key && url.trim().length > 0 && key.trim().length > 0);
}

/**
 * Safely initializes and returns the singleton browser Supabase client.
 * Returns null if Vercel environment variables are not configured, preserving local CMS mode.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (cachedClient) {
    return cachedClient;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  try {
    cachedClient = createClient<Database>(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return cachedClient;
  } catch (error) {
    console.error("Failed to initialize Supabase client from Vercel environment:", error);
    return null;
  }
}
