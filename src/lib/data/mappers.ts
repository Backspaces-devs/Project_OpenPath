import { calculateVibeScore, metricsFromSearchResult } from "@/lib/scoring/vibe-score";
import type { RepoMetrics } from "@/lib/scoring/types";
import type { GitHubIssue, GitHubRepository } from "@/lib/github/types";
import type { RepositoryRow } from "@/lib/supabase/types";
import type { IssueCardData, RepoCardData } from "@/lib/data/types";

/** Turn a GitHub search/detail payload into the shape the UI renders. */
export function repoFromGitHub(repo: GitHubRepository, extras: Partial<RepoCardData> = {}): RepoCardData {
  const metrics = metricsFromSearchResult(repo);
  return {
    githubId: repo.id,
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description ?? null,
    language: repo.language ?? null,
    topics: repo.topics ?? [],
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    watchers: repo.watchers_count ?? null,
    contributors: null,
    commitsLast90Days: null,
    goodFirstIssues: null,
    helpWantedIssues: null,
    closedIssues: null,
    medianIssueCloseHours: null,
    license: repo.license?.spdx_id ?? repo.license?.key ?? null,
    htmlUrl: repo.html_url,
    homepage: repo.homepage && repo.homepage.trim() !== "" ? repo.homepage : null,
    defaultBranch: repo.default_branch,
    createdAt: repo.created_at,
    pushedAt: repo.pushed_at,
    updatedAt: repo.updated_at,
    archived: repo.archived,
    isFork: repo.fork,
    hasContributing: null,
    hasCodeOfConduct: null,
    hasReadme: null,
    vibe: calculateVibeScore(metrics),
    source: "github",
    syncedAt: null,
    ...extras,
  };
}

/** Turn a Supabase `repositories` row into the shape the UI renders. */
export function repoFromRow(row: RepositoryRow): RepoCardData {
  const metrics: RepoMetrics = {
    stars: row.stars,
    forks: row.forks,
    openIssues: row.open_issues,
    watchers: row.watchers ?? null,
    subscribers: row.subscribers ?? null,
    contributors: row.contributors_count ?? null,
    commitsLast90Days: row.commits_last_90d ?? null,
    commitsLastYear: row.commits_last_year ?? null,
    daysSinceLastPush: row.pushed_at ? daysBetween(row.pushed_at) : null,
    daysSinceCreation: row.repo_created_at ? daysBetween(row.repo_created_at) : null,
    goodFirstIssues: row.good_first_issues ?? null,
    helpWantedIssues: row.help_wanted_issues ?? null,
    closedIssues: row.closed_issues ?? null,
    mergedPullRequests: row.merged_pull_requests ?? null,
    totalPullRequests: null,
    medianIssueCloseHours: row.median_issue_close_hours ? Number(row.median_issue_close_hours) : null,
    topicsCount: row.topics?.length ?? 0,
    descriptionLength: row.description?.length ?? 0,
    hasReadme: row.has_readme ?? null,
    hasLicense: row.has_license ?? null,
    hasContributing: row.has_contributing ?? null,
    hasCodeOfConduct: row.has_code_of_conduct ?? null,
    hasHomepage: row.homepage ? true : false,
    archived: row.is_archived,
    isFork: row.is_fork,
  };

  return {
    githubId: row.github_id,
    owner: row.owner,
    name: row.name,
    fullName: row.full_name,
    description: row.description,
    language: row.primary_language,
    topics: row.topics ?? [],
    stars: row.stars,
    forks: row.forks,
    openIssues: row.open_issues,
    watchers: row.watchers ?? null,
    contributors: row.contributors_count ?? null,
    commitsLast90Days: row.commits_last_90d ?? null,
    goodFirstIssues: row.good_first_issues ?? null,
    helpWantedIssues: row.help_wanted_issues ?? null,
    closedIssues: row.closed_issues ?? null,
    medianIssueCloseHours: row.median_issue_close_hours ? Number(row.median_issue_close_hours) : null,
    license: row.license_spdx,
    htmlUrl: row.html_url,
    homepage: row.homepage,
    defaultBranch: row.default_branch,
    createdAt: row.repo_created_at,
    pushedAt: row.pushed_at,
    updatedAt: row.repo_updated_at,
    archived: row.is_archived,
    isFork: row.is_fork,
    hasContributing: row.has_contributing ?? null,
    hasCodeOfConduct: row.has_code_of_conduct ?? null,
    hasReadme: row.has_readme ?? null,
    vibe: calculateVibeScore(metrics),
    source: "database",
    syncedAt: row.last_synced_at,
  };
}

/** Shape a GitHub issue for the issues feed. */
export function issueFromGitHub(issue: GitHubIssue, repoFullName: string): IssueCardData {
  const labels = issue.labels.map((label) => label.name);
  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    htmlUrl: issue.html_url,
    repoFullName,
    labels,
    comments: issue.comments,
    author: issue.user?.login ?? null,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    isPullRequest: Boolean(issue.pull_request),
    goodFirstIssue: labels.some((label) => label.toLowerCase() === "good first issue"),
  };
}

/** `owner/repo` out of a `https://api.github.com/repos/owner/repo` URL. */
export function repoFullNameFromUrl(repositoryUrl: string | null | undefined): string | null {
  if (!repositoryUrl) return null;
  const match = repositoryUrl.match(/repos\/([^/]+\/[^/]+)$/);
  return match ? match[1] : null;
}

function daysBetween(iso: string): number {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
}
