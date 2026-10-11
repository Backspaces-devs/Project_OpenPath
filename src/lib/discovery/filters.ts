import { z } from "zod";

import { STRATEGIES } from "@/lib/discovery/strategies";
import type { DiscoveryQuery } from "@/lib/discovery/types";
import type { RepoCardData } from "@/lib/data/types";

/**
 * Composable, validated filters.
 *
 * The same query object drives both back ends:
 *  - `buildGitHubSearchQuery` compiles it into a GitHub search string.
 *  - `applyLocalFilters` post-filters results (needed for signals GitHub's
 *    search API cannot express, like a minimum Vibe Score).
 */

export const FilterSchema = z.object({
  language: z.string().max(40).default(""),
  topic: z.string().max(60).default(""),
  minStars: z.number().int().min(0).default(0),
  maxStars: z.number().int().min(0).nullable().default(null),
  minVibe: z.number().min(0).max(100).default(0),
  goodFirstIssuesOnly: z.boolean().default(false),
  pushedWithinDays: z.number().int().min(1).nullable().default(null),
  archived: z.boolean().default(false),
  forks: z.boolean().default(false),
});

export type Filters = z.infer<typeof FilterSchema>;

export function filtersFromQuery(query: DiscoveryQuery): Filters {
  return FilterSchema.parse({
    language: query.language,
    topic: query.topic,
    minStars: query.minStars,
    maxStars: null,
    minVibe: query.minVibe,
    goodFirstIssuesOnly: query.goodFirstIssuesOnly,
    pushedWithinDays: query.pushedWithin ? Number(query.pushedWithin) : null,
    archived: false,
    forks: false,
  });
}

/** Star ceiling for the "Hidden gems" strategy. Shared with the Supabase path. */
export const HIDDEN_GEM_MAX_STARS = 2_000;

/** Escape a value so it can be dropped into a GitHub search qualifier. */
function quote(value: string): string {
  if (/^[\w.-]+$/.test(value)) return value;
  return `"${value.replace(/"/g, "")}"`;
}

/**
 * Compile the query into a GitHub repository-search string.
 *
 * Order matters only for readability — GitHub treats qualifiers as an AND.
 */
export function buildGitHubSearchQuery(query: DiscoveryQuery): string {
  const parts: string[] = [];

  if (query.q) parts.push(query.q);
  parts.push("is:public");
  parts.push("mirror:false");
  if (!query.q.includes("archived:")) parts.push("archived:false");

  const strategy = STRATEGIES[query.strategy] ?? STRATEGIES.vibe;
  for (const qualifier of strategy.qualifiers()) {
    if (!parts.includes(qualifier)) parts.push(qualifier);
  }

  if (query.language) parts.push(`language:${quote(query.language)}`);
  if (query.topic) parts.push(`topic:${quote(query.topic)}`);

  // Hidden gems need a floor as well as the ceiling, otherwise we surface
  // abandoned 3-star repos alongside genuinely underrated ones.
  const maxStars = strategy.id === "hidden_gems" ? HIDDEN_GEM_MAX_STARS : null;
  const minStars = query.minStars > 0 ? query.minStars : maxStars ? 10 : null;
  if (minStars) parts.push(`stars:>=${minStars}`);
  if (maxStars) parts.push(`stars:<=${maxStars}`);

  if (query.goodFirstIssuesOnly) parts.push("good-first-issues:>0");

  if (query.pushedWithin) {
    const since = new Date(Date.now() - Number(query.pushedWithin) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const qualifier = `pushed:>=${since}`;
    if (!parts.some((part) => part.startsWith("pushed:"))) parts.push(qualifier);
  }

  return parts.join(" ").trim();
}

/** Filters GitHub cannot express in its query language. */
export function applyLocalFilters(items: RepoCardData[], query: DiscoveryQuery): RepoCardData[] {
  const minVibe = query.minVibe ?? 0;
  const pushedWithin = query.pushedWithin ? Number(query.pushedWithin) : null;

  return items.filter((repo) => {
    if (repo.archived) return false;
    if (repo.isFork) return false;
    if (minVibe > 0 && repo.vibe.score < minVibe) return false;
    if (query.minStars > 0 && repo.stars < query.minStars) return false;
    if (query.language && repo.language?.toLowerCase() !== query.language.toLowerCase()) return false;
    if (query.topic && !repo.topics.some((topic) => topic.toLowerCase() === query.topic.toLowerCase())) {
      return false;
    }
    // Only enforced when we actually know the count. On the live GitHub path the
    // `good-first-issues:>0` search qualifier already did the filtering server-side.
    if (query.goodFirstIssuesOnly && repo.goodFirstIssues !== null && repo.goodFirstIssues < 1) {
      return false;
    }
    if (pushedWithin) {
      const days = repo.pushedAt ? (Date.now() - Date.parse(repo.pushedAt)) / 86_400_000 : Infinity;
      if (days > pushedWithin) return false;
    }
    return true;
  });
}

/** Supabase `.range()` offsets for the current page. */
export function paginationRange(page: number, perPage: number): { from: number; to: number } {
  const safePage = Math.max(1, Math.floor(page));
  const safePerPage = Math.min(48, Math.max(12, Math.floor(perPage)));
  const from = (safePage - 1) * safePerPage;
  return { from, to: from + safePerPage - 1 };
}

export function pageCount(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(Math.min(total, 1_000) / perPage));
}
