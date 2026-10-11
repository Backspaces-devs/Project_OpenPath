import type { DiscoveryStrategy } from "@/lib/discovery/types";
import type { RepoCardData } from "@/lib/data/types";

export interface StrategyDefinition {
  id: DiscoveryStrategy;
  label: string;
  short: string;
  description: string;
  /** Extra GitHub search qualifiers this strategy implies. */
  qualifiers: () => string[];
  /** GitHub search sort applied before our own re-ranking. */
  sort: "best" | "stars" | "updated";
  order: "asc" | "desc";
  /** Supabase ordering used when the database is the source. */
  dbOrder: { column: string; ascending: boolean };
  /** Final client-side ranking. Runs on both data sources. */
  rank: (a: RepoCardData, b: RepoCardData) => number;
  /** Requires the signed-in user's saved preferences. */
  needsProfile?: boolean;
}

function daysSince(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - parsed) / 86_400_000);
}

function ageInDays(repo: RepoCardData): number {
  return Math.max(1, daysSince(repo.createdAt));
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function byNumber(a: number | null, b: number | null, fallback = 0): number {
  return (b ?? fallback) - (a ?? fallback);
}

export const STRATEGIES: Record<DiscoveryStrategy, StrategyDefinition> = {
  vibe: {
    id: "vibe",
    label: "Best vibe",
    short: "Vibe",
    description: "Highest Vibe Score first — alive, documented and welcoming.",
    qualifiers: () => [],
    sort: "best",
    order: "desc",
    dbOrder: { column: "vibe_score", ascending: false },
    rank: (a, b) => byNumber(a.vibe.score, b.vibe.score),
  },

  beginner: {
    id: "beginner",
    label: "Beginner friendly",
    short: "Beginner",
    description: "Open good first issues, plus the docs to help you land one.",
    qualifiers: () => ["good-first-issues:>0"],
    sort: "best",
    order: "desc",
    dbOrder: { column: "good_first_issues", ascending: false },
    rank: (a, b) => {
      const diff = byNumber(a.goodFirstIssues, b.goodFirstIssues);
      return diff !== 0 ? diff : byNumber(a.vibe.score, b.vibe.score);
    },
  },

  active: {
    id: "active",
    label: "Most active",
    short: "Active",
    description: "Pushed in the last week, with maintainers who keep moving.",
    qualifiers: () => [`pushed:>=${isoDaysAgo(7)}`],
    sort: "updated",
    order: "desc",
    dbOrder: { column: "pushed_at", ascending: false },
    rank: (a, b) => daysSince(a.pushedAt) - daysSince(b.pushedAt),
  },

  rising: {
    id: "rising",
    label: "Rising fast",
    short: "Rising",
    description: "Young repos picking up stars faster than their age suggests.",
    qualifiers: () => [`created:>=${isoDaysAgo(365)}`, `pushed:>=${isoDaysAgo(30)}`],
    sort: "stars",
    order: "desc",
    dbOrder: { column: "stars", ascending: false },
    rank: (a, b) => starsPerDay(b) - starsPerDay(a),
  },

  hidden_gems: {
    id: "hidden_gems",
    label: "Hidden gems",
    short: "Gems",
    description: "Under 2k stars but maintained like a much bigger project.",
    // The star ceiling lives in `buildGitHubSearchQuery` so it can also be
    // expressed as a Supabase filter without duplicating the number.
    qualifiers: () => [`pushed:>=${isoDaysAgo(90)}`],
    sort: "best",
    order: "desc",
    dbOrder: { column: "vibe_score", ascending: false },
    rank: (a, b) => gemScore(b) - gemScore(a),
  },

  personalized: {
    id: "personalized",
    label: "For you",
    short: "For you",
    description: "Weighted by the languages you have told us you work in.",
    qualifiers: () => [],
    sort: "best",
    order: "desc",
    dbOrder: { column: "vibe_score", ascending: false },
    rank: (a, b) => byNumber(a.vibe.score, b.vibe.score),
    needsProfile: true,
  },
};

export const STRATEGY_LIST: StrategyDefinition[] = [
  STRATEGIES.vibe,
  STRATEGIES.beginner,
  STRATEGIES.active,
  STRATEGIES.rising,
  STRATEGIES.hidden_gems,
  STRATEGIES.personalized,
];

/** Stars per day since creation — a young repo needs fewer stars to impress. */
export function starsPerDay(repo: RepoCardData): number {
  return repo.stars / ageInDays(repo);
}

/**
 * Gem score: reward a high Vibe Score, penalise the attention it already has.
 * Log-scaled so 50 stars and 500 stars are not treated as worlds apart.
 */
export function gemScore(repo: RepoCardData): number {
  const attention = Math.min(1, Math.log10(repo.stars + 1) / 3.3);
  const penalty = Math.max(0.15, 1 - attention * 0.75);
  return repo.vibe.score * penalty;
}

/** Re-rank a page of results for the chosen strategy. Pure and stable. */
export function rankRepos(items: RepoCardData[], strategy: DiscoveryStrategy): RepoCardData[] {
  const definition = STRATEGIES[strategy] ?? STRATEGIES.vibe;
  return [...items].sort((a, b) => {
    const primary = definition.rank(a, b);
    if (primary !== 0) return primary;
    return a.fullName.localeCompare(b.fullName);
  });
}

/** Personalised ranking needs the user's languages; fall back to vibe if absent. */
export function rankPersonalized(
  items: RepoCardData[],
  preferredLanguages: string[],
): RepoCardData[] {
  const preferred = new Set(preferredLanguages.map((language) => language.toLowerCase()));
  if (preferred.size === 0) return rankRepos(items, "vibe");

  return [...items].sort((a, b) => {
    const boostA = a.language && preferred.has(a.language.toLowerCase()) ? 12 : 0;
    const boostB = b.language && preferred.has(b.language.toLowerCase()) ? 12 : 0;
    const diff = b.vibe.score + boostB - (a.vibe.score + boostA);
    return diff !== 0 ? diff : a.fullName.localeCompare(b.fullName);
  });
}
