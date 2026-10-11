import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseAdminConfigured, supabaseServiceRoleKey, supabaseUrl } from "../src/lib/env";
import { ConfigurationError } from "../src/lib/errors";
import type { RepositoryRow, SyncLogRow } from "../src/lib/supabase/types";

export function adminClient(): SupabaseClient {
  if (!isSupabaseAdminConfigured()) {
    throw new ConfigurationError(
      "This script needs SUPABASE_SERVICE_ROLE_KEY (it bypasses RLS to write).",
      "Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Every github_id already stored, as a Set — used to make seeding resumable. */
export async function existingGithubIds(client: SupabaseClient): Promise<Set<number>> {
  const ids = new Set<number>();
  const pageSize = 1_000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from("repositories")
      .select("github_id")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Could not read existing repositories: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data as Array<{ github_id: number }>) ids.add(row.github_id);
    if (data.length < pageSize) break;
  }

  return ids;
}

export async function startSyncLog(client: SupabaseClient, job: string): Promise<string | null> {
  try {
    const { data } = await client
      .from("sync_log")
      .insert({ job, status: "running" })
      .select("id")
      .single<Pick<SyncLogRow, "id">>();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function finishSyncLog(
  client: SupabaseClient,
  id: string | null,
  patch: Partial<SyncLogRow>,
): Promise<void> {
  if (!id) return;
  try {
    await client
      .from("sync_log")
      .update({ ...patch, finished_at: new Date().toISOString() })
      .eq("id", id);
  } catch {
    // Logging must never fail the job.
  }
}

export type PendingRepo = Pick<
  RepositoryRow,
  "id" | "github_id" | "owner" | "name" | "full_name" | "sync_status" | "last_synced_at"
>;

export async function fetchPendingRepos(
  client: SupabaseClient,
  limit: number,
  options: { includeSynced?: boolean; maxAgeHours?: number } = {},
): Promise<PendingRepo[]> {
  const { includeSynced = false, maxAgeHours = 6 } = options;
  const staleBefore = new Date(Date.now() - maxAgeHours * 3_600_000).toISOString();

  let query = client
    .from("repositories")
    .select("id, github_id, owner, name, full_name, sync_status, last_synced_at")
    .eq("is_archived", false)
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (includeSynced) {
    query = query.or(`sync_status.neq.synced,last_synced_at.lt.${staleBefore},last_synced_at.is.null`);
  } else {
    query = query.neq("sync_status", "synced");
  }

  const { data, error } = await query;
  if (error) throw new Error(`Could not read pending repositories: ${error.message}`);
  return (data ?? []) as PendingRepo[];
}
