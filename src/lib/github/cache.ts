import { isSupabaseAdminConfigured } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { TABLES, type GithubCacheRow } from "@/lib/supabase/types";

export interface CacheEntry {
  etag: string | null;
  data: unknown;
  fetchedAt: string;
}

export type CacheOutcome = "miss" | "hit" | "revalidated";

export interface CacheRead {
  entry: CacheEntry | null;
}

/**
 * ETag cache store.
 *
 * Backed by the `github_cache` table when a service-role key is present, and by
 * a process-local Map otherwise. Both are real caches — the fallback just does
 * not survive a restart — so the app is fully functional with no Supabase at all.
 */
interface CacheStore {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, entry: CacheEntry): Promise<void>;
}

class MemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, CacheEntry>();
  private readonly maxEntries = 2_000;

  async get(key: string): Promise<CacheEntry | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next();
      if (!oldest.done) this.store.delete(oldest.value);
    }
    this.store.set(key, entry);
  }
}

class SupabaseCacheStore implements CacheStore {
  async get(key: string): Promise<CacheEntry | null> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from(TABLES.githubCache)
        .select("cache_key, etag, data, fetched_at")
        .eq("cache_key", key)
        .maybeSingle<GithubCacheRow>();
      if (error || !data) return null;
      return { etag: data.etag, data: data.data, fetchedAt: data.fetched_at };
    } catch {
      return null;
    }
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    try {
      await getSupabaseAdminClient()
        .from(TABLES.githubCache)
        .upsert(
          {
            cache_key: key,
            etag: entry.etag,
            data: entry.data as never,
            fetched_at: entry.fetchedAt,
          },
          { onConflict: "cache_key" },
        );
    } catch {
      // Cache writes must never fail a request.
    }
  }
}

const memoryStore = new MemoryCacheStore();

function store(): CacheStore {
  return isSupabaseAdminConfigured() ? new SupabaseCacheStore() : memoryStore;
}

export async function readCache(key: string): Promise<CacheEntry | null> {
  return store().get(key);
}

export async function writeCache(
  key: string,
  entry: { etag: string | null; data: unknown },
): Promise<void> {
  await store().set(key, { ...entry, fetchedAt: new Date().toISOString() });
}

/**
 * Conditional `If-None-Match` header for a cache key, or `undefined` on a miss.
 */
export async function conditionalHeaders(key: string): Promise<Record<string, string>> {
  const entry = await readCache(key);
  if (entry?.etag) return { "If-None-Match": entry.etag };
  return {};
}
