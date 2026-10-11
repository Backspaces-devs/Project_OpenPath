import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireServiceRoleKey, requireSupabaseUrl } from "@/lib/env";

const GLOBAL_KEY = Symbol.for("openpath.supabase.admin");

/**
 * Service-role client. **Bypasses RLS entirely.**
 *
 * Only ever import this from:
 *   - scripts under /scripts
 *   - route handlers that are guarded by a shared secret / webhook signature
 *
 * Never import it from a component or a page — the key must not reach the bundle.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const client = createClient(requireSupabaseUrl(), requireServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-application-name": "openpath-admin" },
    },
  });
  return client;
}

export function getSupabaseAdminClient(): SupabaseClient {
  const store = globalThis as unknown as Record<symbol, SupabaseClient | undefined>;
  const existing = store[GLOBAL_KEY];
  if (existing) return existing;
  const client = createSupabaseAdminClient();
  store[GLOBAL_KEY] = client;
  return client;
}
