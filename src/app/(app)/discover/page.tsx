export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { queryRepositories } from "@/lib/discovery/filters";
import { DiscoveryFiltersSchema, type DiscoveryStrategy } from "@/lib/discovery/types";
import { type RepoCardData } from "@/components/ui/repo-card";
import { DiscoverClient } from "./discover-client";
import { SkeletonCard } from "@/components/ui/skeleton-card";

interface DiscoverPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};

  const rawStrategy = typeof resolvedParams.strategy === "string" ? resolvedParams.strategy : "vibe";
  const rawLang = typeof resolvedParams.language === "string" ? resolvedParams.language : undefined;
  const rawSearch = typeof resolvedParams.search === "string" ? resolvedParams.search : undefined;
  const rawPage = typeof resolvedParams.page === "string" ? parseInt(resolvedParams.page, 10) : 1;

  const filters = DiscoveryFiltersSchema.parse({
    strategy: rawStrategy,
    language: rawLang,
    search: rawSearch,
    page: isNaN(rawPage) ? 1 : rawPage,
    pageSize: 24,
  });

  let repos: RepoCardData[] = [];
  let total = 0;

  try {
    const result = await queryRepositories<RepoCardData>(filters);
    repos = result.data;
    total = result.total;
  } catch (error) {
    // If Supabase is not connected or seeded yet, return empty list gracefully
    console.warn("[DiscoverPage] Database query warning (database may not be seeded yet):", error);
    repos = [];
    total = 0;
  }

  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          <div className="h-10 w-48 bg-white/[0.06] rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      }
    >
      <DiscoverClient
        initialRepos={repos}
        totalCount={total}
        currentStrategy={filters.strategy as DiscoveryStrategy}
        currentLanguage={filters.language || "All"}
        currentSearch={filters.search || ""}
      />
    </Suspense>
  );
}
