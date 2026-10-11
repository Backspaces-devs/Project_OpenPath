import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAnonKey, requireSupabaseUrl } from "@/lib/env";

const GLOBAL_KEY = Symbol.for("openpath.supabase.browser");

/**
 * Browser client. Uses the anon key and is therefore fully governed by RLS —
 * it can never write to `repositories`, only read.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  const client = createClient(requireSupabaseUrl(), requireSupabaseAnonKey(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  const store = globalThis as unknown as Record<symbol, SupabaseClient | undefined>;
  store[GLOBAL_KEY] = client;
  return client;
}

let cached: SupabaseClient | null = null;

/** Cached singleton for client components. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (cached) return cached;
  cached = createSupabaseBrowserClient();
  return cached;
}
