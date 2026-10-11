"use client";

import { ExternalLink, GitPullRequestArrow, LoaderCircle, SearchX } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { useLocalStorageString, writeLocalStorageString } from "@/lib/hooks/use-local-storage";
import type { PullRequestCardData } from "@/lib/data/types";
import { formatRelativeTime } from "@/lib/utils";

const STORAGE_KEY = "openpath:github-login";

interface LoadedPrs {
  user: string;
  items: PullRequestCardData[];
  total: number | null;
}

const INITIAL: LoadedPrs = { user: "", items: [], total: null };

export function MyPullRequests() {
  const storedLogin = useLocalStorageString(STORAGE_KEY);

  // `draft.source` remembers which login produced the current text, so a
  // hydration or a "Clear" resets the input while typing is preserved.
  const [draft, setDraft] = useState({ source: storedLogin, value: storedLogin });
  if (draft.source !== storedLogin) setDraft({ source: storedLogin, value: storedLogin });

  const [loaded, setLoaded] = useState<LoadedPrs>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  const busy = storedLogin !== "" && loaded.user !== storedLogin;
  const fresh = loaded.user === storedLogin;
  const items = fresh ? loaded.items : [];
  const total = fresh ? loaded.total : null;

  useEffect(() => {
    if (!storedLogin || loaded.user === storedLogin) return;

    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/pulls?user=${encodeURIComponent(storedLogin)}`);
        const payload = (await response.json()) as {
          items?: PullRequestCardData[];
          totalCount?: number;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok || payload.error) {
          setError(payload.error ?? `Request failed (${response.status})`);
          setLoaded({ user: storedLogin, items: [], total: null });
        } else {
          setError(null);
          setLoaded({ user: storedLogin, items: payload.items ?? [], total: payload.totalCount ?? 0 });
        }
      } catch {
        if (cancelled) return;
        setError("Could not reach the OpenPath API.");
        setLoaded({ user: storedLogin, items: [], total: null });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [storedLogin, loaded.user]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = draft.value.trim();
    if (!value) return;
    writeLocalStorageString(STORAGE_KEY, value);
  };

  const clear = () => {
    writeLocalStorageString(STORAGE_KEY, null);
    setLoaded(INITIAL);
    setError(null);
  };

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3.5 font-mono text-xs text-white/25">
            github.com/
          </span>
          <input
            value={draft.value}
            onChange={(event) => setDraft((previous) => ({ ...previous, value: event.target.value }))}
            placeholder="octocat"
            aria-label="GitHub username"
            className="h-10 w-64 rounded-full border border-white/10 bg-white/5 pr-3 pl-[5.75rem] text-sm text-white/90 placeholder:text-white/30 transition-colors duration-200 hover:bg-white/[0.07] focus:border-white/20 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !draft.value.trim()}
          className="h-10 rounded-full bg-white px-4 text-xs font-semibold text-black transition-colors duration-200 hover:bg-white/90 disabled:opacity-40"
        >
          {busy ? "Loading…" : "Load PRs"}
        </button>
        {storedLogin ? (
          <button
            type="button"
            onClick={clear}
            className="h-10 rounded-full px-3 text-xs text-white/40 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white/80"
          >
            Clear
          </button>
        ) : null}
      </form>

      {error ? <Notice tone="warning">{error}</Notice> : null}

      {!storedLogin ? (
        <EmptyState
          icon={GitPullRequestArrow}
          title="No GitHub login yet"
          description="Add one above to see every open pull request that account has across public repositories."
        />
      ) : busy ? (
        <div className="flex items-center gap-2 py-10 text-sm text-white/40">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Fetching open pull requests…
        </div>
      ) : items.length === 0 && !error ? (
        <EmptyState
          icon={SearchX}
          title={`No open pull requests for ${storedLogin}`}
          description="Either everything is merged, or the account has no public pull requests open right now."
        />
      ) : (
        <div className="space-y-3">
          {total !== null ? (
            <p className="text-xs text-white/40">
              <span className="font-mono">{total}</span> open pull request{total === 1 ? "" : "s"}
            </p>
          ) : null}

          <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
            {items.map((pr) => (
              <li key={pr.id}>
                <a
                  href={pr.htmlUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex items-start gap-3 px-4 py-3.5 transition-colors duration-200 hover:bg-white/[0.05]"
                >
                  <GitPullRequestArrow className="mt-0.5 size-4 shrink-0 text-white/30" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[11px] text-white/40">
                      {pr.repoFullName}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-white/85 group-hover:text-white">
                      {pr.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] text-white/25">
                      <span>#{pr.number}</span>
                      <span>opened {formatRelativeTime(pr.createdAt)}</span>
                      <span>updated {formatRelativeTime(pr.updatedAt)}</span>
                      {pr.draft ? <span className="text-white/40">draft</span> : null}
                    </span>
                  </span>
                  <ExternalLink
                    className="mt-0.5 size-3.5 shrink-0 text-white/20 group-hover:text-white/50"
                    aria-hidden
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
