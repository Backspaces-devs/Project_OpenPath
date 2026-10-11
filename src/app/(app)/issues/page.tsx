import { CircleDot, SearchX } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { AutoSubmit } from "@/components/discover/auto-submit";
import { Pagination } from "@/components/discover/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { IssueCard } from "@/components/ui/issue-card";
import { Notice } from "@/components/ui/notice";
import { SearchBar } from "@/components/ui/search-bar";
import { SkeletonLine } from "@/components/ui/skeleton-card";
import { DISCOVERY_LANGUAGES } from "@/components/discover/filter-bar";
import { discoverIssues } from "@/lib/data/issues";
import { issueToSearchParams, parseIssueQuery, type IssueQuery } from "@/lib/discovery/types";
import { cn, formatNumber } from "@/lib/utils";

export const metadata = { title: "Issues · OpenPath" };

// Every page under the app shell is request-driven (searchParams, live GitHub
// data), so it is allowed to block navigation rather than pretend to be instant.
export const instant = false;


const LABEL_PRESETS = [
  { value: "good first issue", label: "Good first issue" },
  { value: "help wanted", label: "Help wanted" },
  { value: "good first issue,help wanted", label: "Either" },
  { value: "documentation", label: "Documentation" },
  { value: "bug", label: "Bug" },
  { value: "", label: "Any label" },
];

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function IssuesPage({ searchParams }: PageProps) {
  const query = parseIssueQuery(await searchParams);
  const preserve = Object.fromEntries(
    issueToSearchParams({ ...query, q: "", page: 1 }).entries(),
  );

  return (
    <div className="space-y-6">
      <header className="space-y-5">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-white/30 uppercase">Issues</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white/90">
            Open issues worth picking up
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/50">
            Straight from GitHub&apos;s issue search — every result is open, on a public repository,
            and sorted by when it was filed.
          </p>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SearchBar
            initialValue={query.q}
            action="/issues"
            preserve={preserve}
            className="xl:max-w-sm"
            placeholder="Search issues by keyword…"
          />
          <form
            id="issue-filters"
            method="GET"
            action="/issues"
            className="flex flex-wrap items-center gap-2"
          >
            {query.q ? <input type="hidden" name="q" value={query.q} /> : null}

            <div className="relative">
              <select
                name="labels"
                defaultValue={query.labels}
                aria-label="Label"
                className="h-9 appearance-none rounded-full border border-white/10 bg-white/5 pr-7 pl-3 text-xs text-white/80 transition-colors duration-200 hover:bg-white/[0.07] focus:border-white/20 focus:outline-none"
              >
                {LABEL_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <svg
                aria-hidden
                viewBox="0 0 8 5"
                className="pointer-events-none absolute top-1/2 right-3 h-[5px] w-2 -translate-y-1/2 fill-none stroke-white/30"
              >
                <path d="M1 1l3 3 3-3" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </div>

            <div className="relative">
              <select
                name="language"
                defaultValue={query.language}
                aria-label="Language"
                className="h-9 appearance-none rounded-full border border-white/10 bg-white/5 pr-7 pl-3 text-xs text-white/80 transition-colors duration-200 hover:bg-white/[0.07] focus:border-white/20 focus:outline-none"
              >
                <option value="">All languages</option>
                {DISCOVERY_LANGUAGES.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
              <svg
                aria-hidden
                viewBox="0 0 8 5"
                className="pointer-events-none absolute top-1/2 right-3 h-[5px] w-2 -translate-y-1/2 fill-none stroke-white/30"
              >
                <path d="M1 1l3 3 3-3" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </div>

            <button
              type="submit"
              className="h-9 rounded-full bg-white px-4 text-xs font-semibold text-black transition-colors duration-200 hover:bg-white/90"
            >
              Apply
            </button>

            <AutoSubmit formId="issue-filters" />
          </form>
        </div>
      </header>

      <Suspense key={JSON.stringify(query)} fallback={<IssueSkeletonGrid />}>
        <Results query={query} />
      </Suspense>
    </div>
  );
}

async function Results({ query }: { query: IssueQuery }) {
  // Live GitHub data — render at request time, never during prerender.
  await connection();
  const result = await discoverIssues(query);

  if (result.items.length === 0) {
    return (
      <EmptyState
        icon={result.warning ? SearchX : CircleDot}
        title={result.warning ? "We could not load issues" : "No issues matched"}
        description={
          result.warning ??
          "Try a broader label, a different language, or clearing the search box."
        }
        action={
          <Link
            href="/issues"
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition-colors duration-200 hover:bg-white/90"
          >
            Reset
          </Link>
        }
      />
    );
  }

  const from = (result.page - 1) * result.perPage + 1;
  const to = Math.min(result.page * result.perPage, result.totalCount);

  return (
    <div className="space-y-5">
      {result.warning ? <Notice tone="warning">{result.warning}</Notice> : null}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/40">
        <span className="font-mono">
          {formatNumber(from)}–{formatNumber(to)}
        </span>
        <span>of</span>
        <span className="font-mono">{formatNumber(result.totalCount)}</span>
        <span>open issues</span>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {result.items.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        hrefFor={(page) => {
          const params = issueToSearchParams({ ...query, page });
          const suffix = params.toString();
          return suffix ? `/issues?${suffix}` : "/issues";
        }}
        className="pt-2"
      />
    </div>
  );
}

function IssueSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className={cn("rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5")}
        >
          <SkeletonLine className="h-3 w-32" />
          <SkeletonLine className="mt-2 h-4 w-3/4" />
          <div className="mt-3 flex gap-2">
            <SkeletonLine className="h-4 w-24 rounded-full" />
            <SkeletonLine className="h-4 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
