import { getGitHubClient } from "@/lib/github/client";
import { GitHubApiError } from "@/lib/errors";
import {
  GitHubContentSchema,
  GitHubContributorSchema,
  GitHubCommitSchema,
  GitHubIssueSchema,
  GitHubRepositorySchema,
  GitHubSearchIssuesResponseSchema,
  GitHubSearchReposResponseSchema,
  type GitHubCommit,
  type GitHubContributor,
  type GitHubIssue,
  type GitHubRepository,
} from "@/lib/github/types";

/**
 * High-level GitHub reads. Every function validates its payload with Zod before
 * it leaves this module, and every one of them draws from the shared client so
 * token rotation and rate limiting apply uniformly.
 */

/** GitHub caps search at the first 1,000 results — page × perPage may not exceed it. */
export const SEARCH_RESULT_CEILING = 1_000;

export interface SearchParams {
  q: string;
  sort?: "best" | "stars" | "forks" | "help-wanted-issues" | "updated";
  order?: "asc" | "desc";
  page?: number;
  perPage?: number;
  /** Seconds. Forwarded to Next.js so identical searches share a cache entry. */
  revalidate?: number;
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  incomplete: boolean;
}

export async function searchRepositories(params: SearchParams): Promise<SearchResult<GitHubRepository>> {
  const { q, sort = "best", order = "desc", page = 1, perPage = 24, revalidate = 300 } = params;
  const safePage = clampSearchPage(page, perPage);

  const { data } = await getGitHubClient().request("/search/repositories", {
    schema: GitHubSearchReposResponseSchema,
    bucket: "search",
    revalidate,
    query: { q, sort, order, page: safePage, per_page: perPage },
  });

  return {
    items: data.items,
    // The true count — GitHub reports it even past the 1,000 result ceiling.
    // Only pagination is capped (see `pageCount`).
    totalCount: data.total_count,
    incomplete: data.incomplete_results,
  };
}

export interface IssueSearchParams extends Omit<SearchParams, "sort"> {
  sort?: "created" | "updated" | "comments";
}

export async function searchIssues(params: IssueSearchParams): Promise<SearchResult<GitHubIssue>> {
  const { q, sort = "created", order = "desc", page = 1, perPage = 24, revalidate = 300 } = params;
  const safePage = clampSearchPage(page, perPage);

  const { data } = await getGitHubClient().request("/search/issues", {
    schema: GitHubSearchIssuesResponseSchema,
    bucket: "search",
    revalidate,
    query: { q, sort, order, page: safePage, per_page: perPage },
  });

  return {
    items: data.items,
    totalCount: data.total_count,
    incomplete: data.incomplete_results,
  };
}

/** Single repository. ETag-cached, so repeat calls are usually free. */
export async function getRepository(
  owner: string,
  repo: string,
  options: { maxAgeMs?: number; revalidate?: number } = {},
): Promise<GitHubRepository> {
  const { data } = await getGitHubClient().requestCached(`/repos/${owner}/${repo}`, {
    schema: GitHubRepositorySchema,
    bucket: "core",
    key: `repo:${owner}/${repo}`,
    maxAgeMs: options.maxAgeMs ?? 15 * 60 * 1000,
    revalidate: options.revalidate ?? 300,
  });
  return data;
}

export async function getRepoIssues(
  owner: string,
  repo: string,
  options: { state?: "open" | "closed" | "all"; labels?: string; perPage?: number; sort?: "created" | "updated" | "comments"; direction?: "asc" | "desc"; revalidate?: number } = {},
): Promise<GitHubIssue[]> {
  const { state = "open", labels, perPage = 30, sort = "created", direction = "desc", revalidate = 300 } = options;

  const { data } = await getGitHubClient().request(`/repos/${owner}/${repo}/issues`, {
    schema: GitHubIssueSchema.array(),
    bucket: "core",
    revalidate,
    query: { state, labels, per_page: perPage, sort, direction },
  });
  return data;
}

export async function getRepoPulls(
  owner: string,
  repo: string,
  options: { state?: "open" | "closed" | "all"; perPage?: number; revalidate?: number } = {},
): Promise<GitHubIssue[]> {
  const { state = "open", perPage = 30, revalidate = 300 } = options;

  const { data } = await getGitHubClient().request(`/repos/${owner}/${repo}/pulls`, {
    schema: GitHubIssueSchema.array(),
    bucket: "core",
    revalidate,
    query: { state, per_page: perPage, sort: "created", direction: "desc" },
  });
  return data;
}

export async function getRepoCommits(
  owner: string,
  repo: string,
  options: { since?: Date; perPage?: number; revalidate?: number } = {},
): Promise<GitHubCommit[]> {
  const { since, perPage = 100, revalidate = 300 } = options;

  const { data } = await getGitHubClient().request(`/repos/${owner}/${repo}/commits`, {
    schema: GitHubCommitSchema.array(),
    bucket: "core",
    revalidate,
    query: {
      per_page: perPage,
      since: since?.toISOString(),
    },
  });
  return data;
}

export async function getRepoContributors(
  owner: string,
  repo: string,
  options: { perPage?: number; maxAgeMs?: number; revalidate?: number } = {},
): Promise<GitHubContributor[]> {
  const { perPage = 100, maxAgeMs = 6 * 60 * 60 * 1000, revalidate = 900 } = options;

  const { data } = await getGitHubClient().requestCached(`/repos/${owner}/${repo}/contributors`, {
    schema: GitHubContributorSchema.array(),
    bucket: "core",
    key: `contributors:${owner}/${repo}`,
    maxAgeMs,
    revalidate,
    query: { per_page: perPage, anon: undefined },
  });
  return data;
}

/**
 * List one directory of a repository. Two calls (root + `.github`) replace the
 * dozen it would take to probe every possible spelling of README, CONTRIBUTING,
 * LICENSE and friends — and ETag caching makes repeats free.
 */
export async function getRepoContents(
  owner: string,
  repo: string,
  path = "",
  options: { maxAgeMs?: number } = {},
): Promise<string[]> {
  try {
    const { data } = await getGitHubClient().requestCached(
      `/repos/${owner}/${repo}/contents/${path}`.replace(/\/$/, ""),
      {
        schema: GitHubContentSchema.array(),
        bucket: "core",
        key: `contents:${owner}/${repo}:${path || "root"}`,
        maxAgeMs: options.maxAgeMs ?? 6 * 60 * 60 * 1000,
      },
    );
    return data.map((entry) => entry.name);
  } catch (error) {
    if (error instanceof GitHubApiError && error.isNotFound) return [];
    // Rate limits must not be reported as "no such directory".
    throw error;
  }
}

/**
 * Does a file exist at the repo root? Uses the contents API and treats 404 as
 * `false` rather than an error — that is the normal answer, not a failure.
 */
export async function checkFileExists(
  owner: string,
  repo: string,
  path: string,
  options: { maxAgeMs?: number } = {},
): Promise<boolean> {
  try {
    await getGitHubClient().requestCached(`/repos/${owner}/${repo}/contents/${path}`, {
      schema: GitHubContentSchema,
      bucket: "core",
      key: `file:${owner}/${repo}:${path}`,
      maxAgeMs: options.maxAgeMs ?? 24 * 60 * 60 * 1000,
    });
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "GitHubApiError" && "status" in error) {
      const status = (error as { status?: number }).status;
      if (status === 404) return false;
    }
    // Rate limits and network blips should not be reported as "no README".
    throw error;
  }
}

/**
 * Match the files a repository ships against the docs OpenPath cares about.
 * Case-insensitive on purpose: `LICENSE`, `license.md` and `COPYING` are the
 * same promise to a contributor.
 */
export function detectDocs(fileNames: string[]): {
  readme: boolean | null;
  contributing: boolean | null;
  codeOfConduct: boolean | null;
  license: boolean | null;
} {
  if (fileNames.length === 0) {
    return { readme: null, contributing: null, codeOfConduct: null, license: null };
  }

  const names = fileNames.map((name) => name.toLowerCase());
  const has = (pattern: RegExp) => names.some((name) => pattern.test(name));

  return {
    readme: has(/^readme(\.(md|rst|txt|adoc|asciidoc|org|mkd))?$/),
    contributing: has(/^contributing(\.(md|rst|txt))?$/) || has(/^contributors(\.(md|rst|txt))?$/),
    codeOfConduct: has(/(code[-_]?of[-_]?conduct|^conduct)(\.(md|rst|txt))?$/),
    license: has(/^(licen[cs]e|copying|copyright)(\.(md|rst|txt))?$/) || has(/^licen[cs]e/),
  };
}

function clampSearchPage(page: number, perPage: number): number {
  const maxPage = Math.max(1, Math.floor(SEARCH_RESULT_CEILING / Math.max(1, perPage)));
  const requested = Number.isFinite(page) ? Math.floor(page) : 1;
  return Math.min(Math.max(1, requested), maxPage);
}
