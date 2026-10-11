"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/ui/search-bar";
import { StrategyToggle } from "@/components/ui/strategy-toggle";
import { RepoCard, type RepoCardData } from "@/components/ui/repo-card";
import { EmptyState } from "@/components/ui/empty-state";
import { type DiscoveryStrategy } from "@/lib/discovery/types";
import { Compass, RefreshCw } from "lucide-react";

const LANGUAGES = [
  "All",
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "C++",
  "Java",
  "Ruby",
];

interface DiscoverClientProps {
  initialRepos: RepoCardData[];
  totalCount: number;
  currentStrategy: DiscoveryStrategy;
  currentLanguage?: string;
  currentSearch?: string;
}

export function DiscoverClient({
  initialRepos,
  totalCount,
  currentStrategy,
  currentLanguage = "All",
  currentSearch = "",
}: DiscoverClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(currentSearch);
  const [strategy, setStrategy] = useState<DiscoveryStrategy>(currentStrategy);
  const [language, setLanguage] = useState(currentLanguage);

  const updateFilters = (newStrategy: DiscoveryStrategy, newLang: string, newSearch: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("strategy", newStrategy);
    if (newLang && newLang !== "All") {
      params.set("language", newLang);
    } else {
      params.delete("language");
    }
    if (newSearch.trim()) {
      params.set("search", newSearch.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");

    startTransition(() => {
      router.push(`/discover?${params.toString()}`);
    });
  };

  const handleStrategyChange = (newStrategy: DiscoveryStrategy) => {
    setStrategy(newStrategy);
    updateFilters(newStrategy, language, search);
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    updateFilters(strategy, newLang, search);
  };

  const handleSearchSubmit = (val: string) => {
    setSearch(val);
    updateFilters(strategy, language, val);
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 sm:gap-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Discover Repositories
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse open-source projects ranked by live contribution health and responsiveness.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.refresh()}
            aria-label="Refresh discovery feed"
            className="flex items-center justify-center size-8 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Strategy Toggle & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <StrategyToggle
          currentStrategy={strategy}
          onSelect={handleStrategyChange}
        />

        <div className="w-full md:w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search repos or topics..."
            onClear={() => handleSearchSubmit("")}
          />
        </div>
      </div>

      {/* Language Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
        {LANGUAGES.map((lang) => {
          const isSelected = (language === "All" && lang === "All") || language === lang;
          return (
            <button
              key={lang}
              type="button"
              onClick={() => handleLanguageChange(lang)}
              className={`text-[11px] px-3 py-1 rounded-full transition-colors ${
                isSelected
                  ? "bg-white/15 text-white font-medium"
                  : "bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              {lang}
            </button>
          );
        })}
      </div>

      {/* Meta Bar */}
      <div className="flex items-center justify-between text-xs text-white/40 border-b border-white/[0.08] pb-3">
        <span>
          Showing <strong className="text-white font-mono">{initialRepos.length}</strong> of{" "}
          <strong className="text-white font-mono">{totalCount}</strong> repositories
        </span>
        {isPending && <span className="text-[#18CCFC] animate-pulse">Updating...</span>}
      </div>

      {/* Repo Grid */}
      {initialRepos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialRepos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Compass}
          title="No repositories match your criteria"
          description="Try switching discovery strategies, clearing your search term, or selecting another language."
          action={
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setLanguage("All");
                setStrategy("vibe");
                router.push("/discover");
              }}
              className="inline-flex items-center justify-center gap-2 bg-white text-black hover:bg-white/85 text-[13px] font-medium py-2 px-4 rounded-md transition-colors"
            >
              Reset Filters
            </button>
          }
        />
      )}
    </div>
  );
}
