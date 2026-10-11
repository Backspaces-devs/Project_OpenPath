import { Compass, SearchX } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { FilterBar } from "@/components/discover/filter-bar";
import { Pagination } from "@/components/discover/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { RepoCard } from "@/components/ui/repo-card";
import { SearchBar } from "@/components/ui/search-bar";
import { SkeletonGrid } from "@/components/ui/skeleton-card";
import { StrategyToggle } from "@/components/ui/strategy-toggle";
import { discoverRepositories } from "@/lib/data/repositories";
import { STRATEGY_LIST, STRATEGIES } from "@/lib/discovery/strategies";
import {
  discoveryToSearchParams,
  parseDiscoveryQuery,
  withDiscoveryParams,
  type DiscoveryQuery,
} from "@/lib/discovery/types";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Discover · OpenPath" };

// Every page under the app shell is request-driven (searchParams, live GitHub
// data), so it is allowed to block navigation rather than pretend to be instant.
export const instant = false;


interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const query = parseDiscoveryQuery(await searchParams);
  const strategy = STRATEGIES[query.strategy] ?? STRATEGIES.vibe;

  const preserve = Object.fromEntries(
    discoveryToSearchParams({ ...query, q: "", page: 1 }).entries(),
  );

  const strategyOptions = STRATEGY_LIST.map((definition) => ({
    id: definition.id,
    label: definition.short,
    href: withDiscoveryParams("/discover", query, { strategy: definition.id }),
    active: definition.id === query.strategy,
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-5">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-white/30 uppercase">Discover</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white/90">
            {strategy.label}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/50">
            {strategy.description}
          </p>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="-mx-4 overflow-x-auto px-4 pb-1 xl:mx-0 xl:px-0">
            <StrategyToggle options={strategyOptions} />
          </div>
          <SearchBar
            initialValue={query.q}
            preserve={preserve}
            className="xl:max-w-sm"
            placeholder="Search repositories, topics, descriptions…"
          />
        </div>

        <FilterBar query={query} />
      </header>

      <Suspense key={JSON.stringify(query)} fallback={<SkeletonGrid count={query.perPage} />}>
        <Results query={query} />
      </Suspense>
    </div>
  );
}

async function Results({ query }: { query: DiscoveryQuery }) {
  // Live GitHub data — render at request time, never during prerender.
  await connection();
  const result = await discoverRepositories(query);
  const from = (result.page - 1) * result.perPage + 1;
  const to = Math.min(result.page * result.perPage, result.totalCount);

  if (result.items.length === 0) {
    return (
      <EmptyState
        icon={result.warning ? SearchX : Compass}
        title={result.warning ? "We could not load repositories" : "No repositories matched"}
        description={
          result.warning ??
          "Try widening the filters — fewer stars, any language, or a longer push window."
        }
        action={
          <Link
            href="/discover"
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition-colors duration-200 hover:bg-white/90"
          >
            Reset filters
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {result.warning ? <Notice tone="warning">{result.warning}</Notice> : null}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/40">
        <span className="font-mono">
          {formatNumber(from)}–{formatNumber(to)}
        </span>
        <span>of</span>
        <span className="font-mono">{formatNumber(result.totalCount)}</span>
        <span>repositories</span>
        <span aria-hidden className="mx-1 text-white/15">
          ·
        </span>
        <span>{result.source === "database" ? "from Supabase" : "live from the GitHub API"}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {result.items.map((repo) => (
          <RepoCard key={repo.githubId} repo={repo} />
        ))}
      </div>

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        hrefFor={(page) => withDiscoveryParams("/discover", query, { page })}
        className="pt-2"
      />
    </div>
  );
}
