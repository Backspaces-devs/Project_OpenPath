import { Check, Database, KeyRound, Server, X, Zap } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { LanguagePicker } from "@/components/account/language-picker";
import { envStatus, githubTokenPool, isSupabaseConfigured } from "@/lib/env";
import { getGitHubClient } from "@/lib/github/client";
import { formatNumber, formatRelativeTime } from "@/lib/utils";

export const metadata = { title: "Status · OpenPath" };

// Every page under the app shell is request-driven (searchParams, live GitHub
// data), so it is allowed to block navigation rather than pretend to be instant.
export const instant = false;


const TABLES_PROBED = [
  "repositories",
  "issues",
  "profiles",
  "collections",
  "collection_items",
  "contributions",
  "student_projects",
  "project_applications",
  "repo_questions",
  "repo_answers",
  "quests",
  "user_quests",
  "sync_log",
  "repo_embeddings",
  "github_cache",
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[11px] tracking-[0.2em] text-white/30 uppercase">Status</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white/90">
          What OpenPath is connected to
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/50">
          Everything below is optional. With no environment variables at all the app still runs — it
          just talks to GitHub directly instead of reading a synced database.
        </p>
      </header>

      {/* Async + Suspense so env and rate limits are read per request, never baked at build. */}
      <Suspense fallback={<PanelSkeleton />}>
        <EnvironmentStatus />
      </Suspense>

      <Suspense fallback={<PanelSkeleton />}>
        <GitHubStatus />
      </Suspense>

      <Suspense fallback={<PanelSkeleton />}>
        <DatabaseStatus />
      </Suspense>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-white/40" aria-hidden />
          <h2 className="text-sm font-semibold text-white/90">Personalised ranking</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/50">
          The <span className="text-white/70">For you</span> strategy weights results by the languages
          you work in. Pick them here and OpenPath remembers them in a cookie — no account needed.
        </p>
        <LanguagePicker />
        <p className="mt-4 text-xs text-white/30">
          Sign in with Supabase and these live on your profile instead.
        </p>
      </section>

      <p className="text-xs text-white/25">
        Looking for the app itself?{" "}
        <Link
          href="/discover"
          className="text-white/50 underline-offset-4 hover:text-white/80 hover:underline"
        >
          Go to Discover
        </Link>
        .
      </p>
    </div>
  );
}

async function EnvironmentStatus() {
  // Env is read per request so the panel reflects a restart without a rebuild.
  await connection();
  const items = envStatus();

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <KeyRound className="size-4 text-white/40" aria-hidden />
        <h2 className="text-sm font-semibold text-white/90">Environment</h2>
        <span className="ml-auto font-mono text-[10px] text-white/30">
          {items.filter((item) => item.present).length}/{items.length} set
        </span>
      </div>

      <ul className="mt-4 divide-y divide-white/[0.06]">
        {items.map((item) => (
          <li key={item.name} className="flex items-start gap-3 py-3">
            <span
              className={
                item.present
                  ? "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/[0.10]"
                  : "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]"
              }
            >
              {item.present ? (
                <Check className="size-2.5 text-emerald-400/90" aria-hidden />
              ) : (
                <X className="size-2.5 text-white/25" aria-hidden />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-xs text-white/80">{item.name}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-white/40">
                {item.description}
              </span>
            </span>
            <span className="mt-0.5 shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/40">
              optional
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-white/[0.08] pt-4 text-xs leading-relaxed text-white/40">
        Copy <span className="font-mono text-white/70">.env.example</span> to{" "}
        <span className="font-mono text-white/70">.env.local</span>, fill in what you have, then
        restart the dev server. Keys are never sent to the browser unless they are prefixed{" "}
        <span className="font-mono text-white/70">NEXT_PUBLIC_</span>.
      </p>
    </section>
  );
}

async function GitHubStatus() {
  await connection();
  const client = getGitHubClient();
  const remote = await client.rateLimit();
  const buckets = client.localBuckets();
  const health = client.tokenHealth();

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Server className="size-4 text-white/40" aria-hidden />
        <h2 className="text-sm font-semibold text-white/90">GitHub connection</h2>
        <span
          className={
            client.isAuthenticated
              ? "ml-auto rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2 py-0.5 text-[10px] text-emerald-400/90"
              : "ml-auto rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/40"
          }
        >
          {client.isAuthenticated
            ? `${githubTokenPool().length} token${githubTokenPool().length === 1 ? "" : "s"}`
            : "anonymous"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Metric
          label="Core API remaining"
          value={
            remote.core
              ? `${formatNumber(remote.core.remaining)} / ${formatNumber(remote.core.limit)}`
              : "—"
          }
          hint={remote.core ? `resets ${formatRelativeTime(remote.core.resetAt.toISOString())}` : "unavailable"}
        />
        <Metric
          label="Search API remaining"
          value={
            remote.search
              ? `${formatNumber(remote.search.remaining)} / ${formatNumber(remote.search.limit)}`
              : "—"
          }
          hint={
            remote.search ? `resets ${formatRelativeTime(remote.search.resetAt.toISOString())}` : "unavailable"
          }
        />
      </div>

      <div className="mt-4 space-y-2 border-t border-white/[0.08] pt-4">
        <p className="text-[11px] tracking-wide text-white/30 uppercase">
          Token pool state (this server process)
        </p>
        {health.map((token) => (
          <div key={token.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="font-mono text-white/60">{token.label}</span>
            <span className="font-mono text-white/40">
              {token.remaining === null
                ? "not used yet"
                : `${formatNumber(token.remaining)} left${token.exhausted ? " · exhausted" : ""}`}
            </span>
          </div>
        ))}
        {buckets.map((bucket) => (
          <div key={bucket.name} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-white/40">{bucket.name} bucket</span>
            <span className="font-mono text-white/40">
              {formatNumber(bucket.remaining)} / {formatNumber(Math.round(bucket.capacity))}
            </span>
          </div>
        ))}
      </div>

      {!client.isAuthenticated ? (
        <p className="mt-4 border-t border-white/[0.08] pt-4 text-xs leading-relaxed text-white/40">
          Anonymous mode allows 60 requests/hour per IP, which is enough to browse Discover. A free
          Personal Access Token with the <span className="font-mono text-white/70">public_repo</span>{" "}
          scope raises it to 5,000/hour and unlocks accurate Vibe Scores on repository pages.
        </p>
      ) : null}
    </section>
  );
}

async function DatabaseStatus() {
  await connection();
  if (!isSupabaseConfigured()) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-white/40" aria-hidden />
          <h2 className="text-sm font-semibold text-white/90">Supabase</h2>
          <span className="ml-auto rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/40">
            not configured
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/50">
          Running entirely on live GitHub data. Add{" "}
          <span className="font-mono text-white/70">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
          <span className="font-mono text-white/70">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to switch
          discovery over to a synced database — worth doing once you want Vibe Scores computed from
          full commit and issue history rather than search-result fields alone.
        </p>
      </section>
    );
  }

  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();

  const counts = await Promise.all(
    TABLES_PROBED.map(async (table) => {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        return { table, count: error ? null : (count ?? 0) };
      } catch {
        return { table, count: null };
      }
    }),
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Database className="size-4 text-white/40" aria-hidden />
        <h2 className="text-sm font-semibold text-white/90">Supabase tables</h2>
        <span className="ml-auto rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2 py-0.5 text-[10px] text-emerald-400/90">
          connected
        </span>
      </div>

      <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {counts.map((entry) => (
          <li key={entry.table} className="flex items-center justify-between gap-3 text-xs">
            <span className="font-mono text-white/60">{entry.table}</span>
            <span className="font-mono text-white/40">
              {entry.count === null ? "unavailable" : formatNumber(entry.count)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="mt-1 font-mono text-sm text-white/90">{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-white/25">{hint}</p> : null}
    </div>
  );
}

function PanelSkeleton() {
  return <div className="h-56 animate-pulse rounded-2xl bg-white/[0.03]" />;
}
