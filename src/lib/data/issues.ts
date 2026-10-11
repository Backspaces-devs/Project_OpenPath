import { GitHubApiError, RateLimitError } from "@/lib/errors";
import { searchIssues } from "@/lib/github/fetchers";
import { pageCount } from "@/lib/discovery/filters";
import { issueFromGitHub, repoFullNameFromUrl } from "@/lib/data/mappers";
import type { IssueQuery } from "@/lib/discovery/types";
import type { IssueFeedResult, PullRequestCardData } from "@/lib/data/types";

/**
 * Live good-first-issue feed. GitHub's issue search is the source of truth —
 * there is no copy of it in Supabase until a repo is synced, and even then the
 * search index is fresher.
 */
export async function discoverIssues(query: IssueQuery): Promise<IssueFeedResult> {
  const parts = ["is:issue", "is:open", "archived:false"];

  if (query.labels) {
    for (const label of splitLabels(query.labels)) parts.push(`label:"${label}"`);
  }
  if (query.language) parts.push(`language:${query.language}`);
  if (query.q) parts.push(query.q);

  try {
    const { items, totalCount } = await searchIssues({
      q: parts.join(" "),
      sort: "created",
      order: "desc",
      page: query.page,
      perPage: query.perPage,
    });

    const mapped = items
      .map((issue) => {
        const repoFullName = repoFullNameFromUrl(issue.repository_url);
        if (!repoFullName) return null;
        return issueFromGitHub(issue, repoFullName);
      })
      .filter((issue): issue is NonNullable<typeof issue> => issue !== null);

    return {
      items: mapped,
      totalCount,
      page: query.page,
      perPage: query.perPage,
      pageCount: pageCount(totalCount, query.perPage),
    };
  } catch (error) {
    if (error instanceof RateLimitError || error instanceof GitHubApiError) {
      return {
        items: [],
        totalCount: 0,
        page: query.page,
        perPage: query.perPage,
        pageCount: 1,
        warning: `${error.message} ${error.hint ?? ""}`.trim(),
      };
    }
    throw error;
  }
}

/** Open pull requests authored by a GitHub login. */
export async function getUserPullRequests(
  username: string,
  options: { page?: number; perPage?: number } = {},
): Promise<{ items: PullRequestCardData[]; totalCount: number }> {
  const login = username.trim().replace(/[^\w-]/g, "");
  if (!login) return { items: [], totalCount: 0 };

  const { items, totalCount } = await searchIssues({
    q: `is:pr is:open author:${login} archived:false`,
    sort: "updated",
    order: "desc",
    page: options.page ?? 1,
    perPage: options.perPage ?? 25,
  });

  return {
    items: items.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      htmlUrl: pr.html_url,
      repoFullName: repoFullNameFromUrl(pr.repository_url) ?? "unknown/repo",
      state: pr.state,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      draft: pr.draft,
      labels: pr.labels.map((label) => label.name),
    })),
    totalCount,
  };
}

/** Accepts a comma separated label list or a single label. */
function splitLabels(value: string): string[] {
  return value
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 5);
}
