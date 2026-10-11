"use client";

import { Bookmark, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { RepoCard } from "@/components/ui/repo-card";
import { useSavedRepos } from "@/lib/saved";
import type { RepoCardData } from "@/lib/data/types";

interface LoadedRepos {
  key: string;
  repos: RepoCardData[];
  missing: string[];
}

const INITIAL: LoadedRepos = { key: "", repos: [], missing: [] };

export function SavedList() {
  const slugs = useSavedRepos();
  const key = slugs.join(",");

  const [loaded, setLoaded] = useState<LoadedRepos>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  // While a fetch is in flight `loaded.key` is stale, which is exactly the
  // signal we need — no separate loading flag to keep in sync.
  const busy = key !== "" && loaded.key !== key;
  const fresh = loaded.key === key;
  const repos = fresh ? loaded.repos : [];
  const missing = fresh ? loaded.missing : [];

  useEffect(() => {
    if (!key || loaded.key === key) return;

    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams();
        for (const slug of key.split(",")) params.append("full_name", slug);
        const response = await fetch(`/api/repos?${params.toString()}`);
        const payload = (await response.json()) as { repos?: RepoCardData[]; missing?: string[] };
        if (cancelled) return;
        setError(null);
        setLoaded({ key, repos: payload.repos ?? [], missing: payload.missing ?? [] });
      } catch {
        if (cancelled) return;
        setError("Could not reach the OpenPath API.");
        setLoaded({ key, repos: [], missing: [] });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [key, loaded.key]);

  if (slugs.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Nothing saved yet"
        description="Use the bookmark flag on any repository card in Discover. Saved repos live in this browser until you connect Supabase."
      />
    );
  }

  return (
    <div className="space-y-5">
      {error ? <Notice tone="warning">{error}</Notice> : null}
      {missing.length > 0 ? (
        <Notice tone="info">
          {missing.length} saved {missing.length === 1 ? "repository is" : "repositories are"} no
          longer reachable on GitHub ({missing.join(", ")}).
        </Notice>
      ) : null}

      <p className="text-xs text-white/40">
        <span className="font-mono">{slugs.length}</span> saved
        {busy ? " · refreshing…" : ` · ${repos.length} loaded`}
      </p>

      {busy && repos.length === 0 ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Fetching live metrics from GitHub…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {repos.map((repo) => (
            <RepoCard key={repo.githubId} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}
