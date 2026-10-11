"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bookmark, Compass, ArrowRight, Trash2 } from "lucide-react";
import { type Repository } from "@/types";
import { MOCK_REPOSITORIES } from "@/lib/data/mock-data";
import { RepoCard } from "@/components/repo/repo-card";

export default function SavedPage() {
  const [savedRepos, setSavedRepos] = useState<Repository[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const items: Repository[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("saved_repo_")) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              items.push(JSON.parse(val));
            } catch {
              // Ignore corrupt
            }
          }
        }
      }

      // If user hasn't saved anything yet, provide top 2 initial repos as sample collection
      if (items.length === 0) {
        setSavedRepos(MOCK_REPOSITORIES.slice(0, 3));
      } else {
        setSavedRepos(items);
      }
    } catch {
      setSavedRepos(MOCK_REPOSITORIES.slice(0, 3));
    } finally {
      setLoaded(true);
    }
  }, []);

  const handleBookmarkToggle = (repoId: number, isSaved: boolean) => {
    if (!isSaved) {
      setSavedRepos((prev) => prev.filter((r) => r.id !== repoId));
    }
  };

  const clearAll = () => {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith("saved_repo_")) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Ignore
    }
    setSavedRepos([]);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bookmark className="size-6 text-amber-400" />
            Saved Repositories & Collections
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your personal shortlist of high-vibe open-source repositories to contribute to.
          </p>
        </div>

        {savedRepos.length > 0 && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 text-xs text-muted-foreground hover:text-rose-400 transition-colors self-start sm:self-center"
          >
            <Trash2 className="size-3.5" />
            Clear List
          </button>
        )}
      </div>

      {!loaded ? (
        <div className="text-xs text-muted-foreground py-12 text-center">Loading saved repos...</div>
      ) : savedRepos.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center space-y-4">
          <Bookmark className="size-8 mx-auto text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">No saved repositories yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Browse through Discover or Good First Issues and click the bookmark icon to save repos
            for later.
          </p>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-semibold text-xs hover:opacity-90"
          >
            <Compass className="size-3.5" />
            Discover Repos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedRepos.map((repo) => (
            <RepoCard
              key={repo.id}
              repo={repo}
              onBookmarkToggle={handleBookmarkToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
