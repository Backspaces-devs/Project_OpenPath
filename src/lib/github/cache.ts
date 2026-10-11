import { createAdminClient } from '@/lib/supabase/admin';

export interface CacheEntry<T = unknown> {
  cacheKey: string;
  etag: string | null;
  data: T;
  fetchedAt: string;
}

export class GitHubCache {
  private getSupabase() {
    return createAdminClient();
  }

  async get<T = unknown>(key: string): Promise<{ etag: string | null; data: T } | null> {
    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from('github_cache')
        .select('etag, data')
        .eq('cache_key', key)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return {
        etag: data.etag,
        data: data.data as T,
      };
    } catch (err) {
      console.warn(`[GitHubCache] Failed to read cache for key: ${key}`, err);
      return null;
    }
  }

  async set(key: string, etag: string | null, data: unknown): Promise<void> {
    try {
      const supabase = this.getSupabase();
      await supabase
        .from('github_cache')
        .upsert(
          {
            cache_key: key,
            etag,
            data,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: 'cache_key' }
        );
    } catch (err) {
      console.warn(`[GitHubCache] Failed to write cache for key: ${key}`, err);
    }
  }
}

export const githubCache = new GitHubCache();
