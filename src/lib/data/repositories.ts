import { cookies } from "next/headers";

import { isSupabaseConfigured } from "@/lib/env";
import { GitHubApiError, RateLimitError, toAppError } from "@/lib/errors";
import {
  detectDocs,
  getRepoContents,
  getRepoContributors,
  getRepoCommits,
  getRepoIssues,
  getRepository,
  searchIssues,
  searchRepositories,
} from "@/lib/github/fetchers";
import {
  HIDDEN_GEM_MAX_STARS,
  applyLocalFilters,
  buildGitHubSearchQuery,
  paginationRange,
  pageCount,
} from "@/lib/discovery/filters";
import { STRATEGIES, rankRepos, rankPersonalized } from "@/lib/discovery/strategies";
import type { DiscoveryQuery } from "@/lib/discovery/types";
import { issueFromGitHub, repoFromGitHub, repoFromRow } from "@/lib/data/mappers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TABLES, type RepositoryRow } from "@/lib/supabase/types";
import type { DataSource, DiscoverResult, IssueCardData, RepoCardData } from "@/lib/data/types";

const REPOSITORY_COLUMNS = "*";

/* ------------------------------------------------------------------ */
/*  Discover                                                           */
/* ------------------------------------------------------------------ */

/**
 * One entry point for discovery.
 *
 * Reads from Supabase when it is configured **and** populated, otherwise goes
 * straight to the GitHub Search API. Both paths return real data — there is no
 * fixture anywhere in this codebase.
 */
export async function discoverRepositories(query: DiscoveryQuery): Promise<DiscoverResult> {
  if (isSupabaseConfigured()) {
    try {
      const fromDb = await discoverFromDatabase(query);
      if (fromDb.totalCount > 0) return fromDb;

      const live = await discoverFromGitHub(query);
      return {
        ...live,
        warning:
          "Supabase is connected but `repositories` is empty — showing live GitHub results. Run `npm run db:seed` then `npm run db:sync` to fill it.",
      };
    } catch (error) {
      // A broken Supabase project should degrade to live data, not a blank page.
      const live = await discoverFromGitHub(query);
      return {
        ...live,
        warning: `Supabase read failed (${toAppError(error).message}). Showing live GitHub results.`,
      };
    }
  }

  return discoverFromGitHub(query);
}

async function discoverFromGitHub(query: DiscoveryQuery): Promise<DiscoverResult> {
  const strategy = STRATEGIES[query.strategy] ?? STRATEGIES.vibe;

  try {
    const { items, totalCount, incomplete } = await searchRepositories({
      q: buildGitHubSearchQuery(query),
      sort: strategy.sort,
      order: strategy.order,
      page: query.page,
      perPage: query.perPage,
    });

    const filtered = applyLocalFilters(items.map((repo) => repoFromGitHub(repo)), query);
    const ranked =
      query.strategy === "personalized"
        ? rankPersonalized(filtered, await preferredLanguages())
        : rankRepos(filtered, query.strategy);

    return {
      items: ranked,
      totalCount,
      page: query.page,
      perPage: query.perPage,
      pageCount: pageCount(totalCount, query.perPage),
      source: "github" satisfies DataSource,
      incomplete,
    };
  } catch (error) {
    if (error instanceof RateLimitError || error instanceof GitHubApiError) {
      return {
        items: [],
        totalCount: 0,
        page: query.page,
        perPage: query.perPage,
        pageCount: 1,
        source: "github",
        warning: friendlyError(error),
      };
    }
    throw error;
  }
}

async function discoverFromDatabase(query: DiscoveryQuery): Promise<DiscoverResult> {
  const supabase = await createSupabaseServerClient();
  const strategy = STRATEGIES[query.strategy] ?? STRATEGIES.vibe;
  const { from, to } = paginationRange(query.page, query.perPage);

  let builder = supabase
    .from(TABLES.repositories)
    .select(REPOSITORY_COLUMNS, { count: "exact" })
    .eq("is_archived", false)
    .eq("is_fork", false);

  if (strategy.dbOrder.column === "vibe_score") {
    builder = builder.not("vibe_score", "is", null);
  }
  if (query.language) builder = builder.ilike("primary_language", query.language);
  if (query.topic) builder = builder.contains("topics", [query.topic.toLowerCase()]);
  if (query.minStars > 0) builder = builder.gte("stars", query.minStars);
  if (query.goodFirstIssuesOnly) builder = builder.gte("good_first_issues", 1);
  if (query.minVibe > 0) builder = builder.gte("vibe_score", query.minVibe);
  if (query.pushedWithin) {
    const since = new Date(Date.now() - Number(query.pushedWithin) * 86_400_000).toISOString();
    builder = builder.gte("pushed_at", since);
  }
  if (query.q) {
    const safe = query.q.replace(/[%,()"'\\]/g, " ").trim();
    if (safe) builder = builder.or(`full_name.ilike.%${safe}%,description.ilike.%${safe}%`);
  }

  if (strategy.id === "hidden_gems") builder = builder.lte("stars", HIDDEN_GEM_MAX_STARS);

  builder = builder.order(strategy.dbOrder.column, { ascending: strategy.dbOrder.ascending, nullsFirst: false });
  builder = builder.order("stars", { ascending: false });
  builder = builder.range(from, to);

  const { data, count, error } = await builder;
  if (error) throw new Error(`Supabase query failed: ${error.message}`);

  const rows = (data ?? []) as RepositoryRow[];
  let items = rows.map(repoFromRow);

  if (query.strategy === "personalized") {
    items = rankPersonalized(items, await preferredLanguages());
  } else if (strategy.id === "rising" || strategy.id === "hidden_gems") {
    items = rankRepos(items, strategy.id);
  }

  return {
    items,
    totalCount: count ?? 0,
    page: query.page,
    perPage: query.perPage,
    pageCount: pageCount(count ?? 0, query.perPage),
    source: "database",
  };
}

/* ------------------------------------------------------------------ */
/*  Repository detail                                                  */
/* ------------------------------------------------------------------ */

export interface ContributorSummary {
  login: string;
  avatarUrl: string | null;
  htmlUrl: string | null;
  contributions: number;
}

export interface RepoDetail {
  repo: RepoCardData;
  goodFirstIssues: IssueCardData[];
  contributors: ContributorSummary[];
  commitsLast90Days: number | null;
  /** Weekly commit buckets, oldest first — feeds the activity chart. */
  commitActivity: Array<{ week: string; commits: number }>;
  docs: {
    readme: boolean | null;
    contributing: boolean | null;
    codeOfConduct: boolean | null;
    license: boolean | null;
  };
  /** Populated when some enrichment call failed but the page can still render. */
  warning?: string;
}

export async function getRepositoryDetail(owner: string, repo: string): Promise<RepoDetail | null> {
  if (isSupabaseConfigured()) {
    try {
      const fromDb = await detailFromDatabase(owner, repo);
      if (fromDb) return fromDb;
    } catch {
      // Fall through to the live path.
    }
  }
  return detailFromGitHub(owner, repo);
}

async function detailFromGitHub(owner: string, repo: string): Promise<RepoDetail | null> {
  let githubRepo;
  try {
    githubRepo = await getRepository(owner, repo);
  } catch (error) {
    if (error instanceof GitHubApiError && error.isNotFound) return null;
    throw error;
  }

  const since = new Date(Date.now() - 90 * 86_400_000);
  const failures: string[] = [];

  const [contributors, commits, closedIssues, gfi, rootFiles, githubDirFiles] = await Promise.allSettled([
    getRepoContributors(owner, repo),
    getRepoCommits(owner, repo, { since, perPage: 100 }),
    getRepoIssues(owner, repo, { state: "closed", perPage: 100, sort: "updated" }),
    searchIssuesPage(owner, repo, ["good first issue"]),
    getRepoContents(owner, repo),
    getRepoContents(owner, repo, ".github"),
  ]);

  const contributorList = settled(contributors, [], failures, "contributors");
  const commitList = settled(commits, [], failures, "commits");
  const closedList = settled(closedIssues, [], failures, "closed issues");
  const gfiList = settled(gfi, [], failures, "good first issues");
  const root = settled(rootFiles, [], failures, "file listing");
  const githubDir = settled(githubDirFiles, [], failures, ".github listing");

  const docs = detectDocs([...root, ...githubDir]);
  const hasReadme = docs.readme;
  const hasContributing = docs.contributing;
  const hasCodeOfConduct = docs.codeOfConduct;

  const medianCloseHours = medianCloseTime(closedList);
  const contributorsCount = contributorList.length > 0 ? contributorList.length : null;

  const card = repoFromGitHub(githubRepo, {
    contributors: contributorsCount,
    commitsLast90Days: commitList.length,
    closedIssues: closedList.length,
    medianIssueCloseHours: medianCloseHours,
    goodFirstIssues: gfiList.length > 0 ? gfiList.length : null,
    hasReadme,
    hasContributing,
    hasCodeOfConduct,
  });

  // Recompute with the richer signals we just collected.
  const { calculateVibeScore } = await import("@/lib/scoring/vibe-score");
  card.vibe = calculateVibeScore({
    stars: card.stars,
    forks: card.forks,
    openIssues: card.openIssues,
    watchers: card.watchers,
    contributors: contributorsCount,
    commitsLast90Days: commitList.length,
    daysSinceLastPush: card.pushedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(card.pushedAt)) / 86_400_000)) : null,
    daysSinceCreation: card.createdAt ? Math.max(0, Math.floor((Date.now() - Date.parse(card.createdAt)) / 86_400_000)) : null,
    goodFirstIssues: gfiList.length > 0 ? gfiList.length : null,
    closedIssues: closedList.length,
    mergedPullRequests: null,
    totalPullRequests: null,
    medianIssueCloseHours: medianCloseHours,
    topicsCount: card.topics.length,
    descriptionLength: card.description?.length ?? 0,
    hasReadme,
    hasLicense: card.license !== null,
    hasContributing,
    hasCodeOfConduct,
    hasHomepage: card.homepage !== null,
    archived: card.archived,
    isFork: card.isFork,
  });

  return {
    repo: card,
    goodFirstIssues: gfiList,
    contributors: contributorList.slice(0, 12).map((entry) => ({
      login: entry.login,
      avatarUrl: entry.avatar_url ?? null,
      htmlUrl: entry.html_url ?? null,
      contributions: entry.contributions,
    })),
    commitsLast90Days: commitList.length,
    commitActivity: bucketCommitsByWeek(commitList.map((commit) => commit.commit?.author?.date ?? null)),
    docs: {
      readme: hasReadme,
      contributing: hasContributing,
      codeOfConduct: hasCodeOfConduct,
      // The contents listing is authoritative — GitHub's `license` field only
      // reflects files it manages to parse.
      license: docs.license || card.license !== null,
    },
    warning: failures.length > 0 ? `Some live metrics were unavailable: ${failures.join(", ")}.` : undefined,
  };
}

async function detailFromDatabase(owner: string, repo: string): Promise<RepoDetail | null> {
  const supabase = await createSupabaseServerClient();
  const fullName = `${owner}/${repo}`;

  const { data: row } = await supabase
    .from(TABLES.repositories)
    .select(REPOSITORY_COLUMNS)
    .ilike("full_name", fullName)
    .maybeSingle<RepositoryRow>();

  if (!row) return null;

  const { data: issueRows } = await supabase
    .from(TABLES.issues)
    .select("*")
    .eq("repo_id", row.id)
    .eq("is_good_first_issue", true)
    .eq("state", "open")
    .order("github_created_at", { ascending: false })
    .limit(10);

  const goodFirstIssues = (issueRows ?? []).map((issue) => ({
    id: Number(issue.github_id),
    number: issue.number,
    title: issue.title,
    htmlUrl: issue.html_url,
    repoFullName: fullName,
    labels: issue.labels ?? [],
    comments: issue.comments ?? 0,
    author: issue.author,
    createdAt: issue.github_created_at ?? new Date().toISOString(),
    updatedAt: issue.github_updated_at ?? new Date().toISOString(),
    isPullRequest: false,
    goodFirstIssue: true,
  })) as IssueCardData[];

  return {
    repo: repoFromRow(row),
    goodFirstIssues,
    contributors: [],
    commitsLast90Days: row.commits_last_90d ?? null,
    commitActivity: [],
    docs: {
      readme: row.has_readme ?? null,
      contributing: row.has_contributing ?? null,
      codeOfConduct: row.has_code_of_conduct ?? null,
      license: row.has_license ?? null,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function searchIssuesPage(owner: string, repo: string, labels: string[]): Promise<IssueCardData[]> {
  const labelQualifier = labels.map((label) => `label:"${label}"`).join(" ");
  const { items } = await searchIssues({
    q: `repo:${owner}/${repo} is:issue is:open ${labelQualifier}`,
    perPage: 10,
    sort: "created",
  });
  return items.map((issue) => issueFromGitHub(issue, `${owner}/${repo}`));
}

function settled<T>(result: PromiseSettledResult<T>, fallback: T, failures: string[], label: string): T {
  if (result.status === "fulfilled") return result.value;
  failures.push(label);
  return fallback;
}

function medianCloseTime(issues: Array<{ created_at: string; closed_at?: string | null }>): number | null {
  const durations = issues
    .map((issue) => {
      if (!issue.closed_at) return null;
      const created = Date.parse(issue.created_at);
      const closed = Date.parse(issue.closed_at);
      if (Number.isNaN(created) || Number.isNaN(closed)) return null;
      return (closed - created) / 3_600_000;
    })
    .filter((value): value is number => value !== null && value >= 0)
    .sort((a, b) => a - b);

  if (durations.length === 0) return null;
  const middle = Math.floor(durations.length / 2);
  return durations.length % 2 === 0
    ? (durations[middle - 1] + durations[middle]) / 2
    : durations[middle];
}

/** Group commit dates into the last 13 weeks. */
function bucketCommitsByWeek(dates: Array<string | null>): Array<{ week: string; commits: number }> {
  const buckets: Array<{ week: string; commits: number }> = [];
  const now = Date.now();
  for (let i = 12; i >= 0; i--) {
    const start = now - i * 7 * 86_400_000;
    buckets.push({ week: new Date(start).toISOString().slice(0, 10), commits: 0 });
  }

  for (const date of dates) {
    if (!date) continue;
    const parsed = Date.parse(date);
    if (Number.isNaN(parsed)) continue;
    const weeksAgo = Math.floor((now - parsed) / (7 * 86_400_000));
    const index = 12 - weeksAgo;
    if (index >= 0 && index < buckets.length) buckets[index].commits += 1;
  }

  return buckets;
}

/**
 * Languages the visitor cares about: their Supabase profile if signed in,
 * otherwise the `openpath_languages` cookie the Settings page writes.
 */
export async function preferredLanguages(): Promise<string[]> {
  try {
    const { getCurrentProfile } = await import("@/lib/supabase/server");
    const profile = await getCurrentProfile();
    if (profile?.id) {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from(TABLES.profiles)
        .select("preferred_languages")
        .eq("id", profile.id)
        .maybeSingle<{ preferred_languages: string[] | null }>();
      if (data?.preferred_languages?.length) return data.preferred_languages;
    }
  } catch {
    // Not signed in, or Supabase is off. Fall through to the cookie.
  }

  try {
    const jar = await cookies();
    const raw = jar.get("openpath_languages")?.value;
    if (!raw) return [];
    return raw.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 12);
  } catch {
    return [];
  }
}

function friendlyError(error: RateLimitError | GitHubApiError): string {
  if (error instanceof RateLimitError) {
    const reset = error.resetAt ? new Date(error.resetAt).toUTCString() : null;
    return `${error.message}${reset ? ` Resets at ${reset}.` : ""} ${error.hint ?? ""}`.trim();
  }
  if (error.status === 401) {
    return "GitHub rejected the token in GITHUB_TOKEN_POOL (401). Generate a new PAT and restart the dev server.";
  }
  return `${error.message} ${error.hint ?? ""}`.trim();
}
