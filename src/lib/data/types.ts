import type { VibeResult } from "@/lib/scoring/types";

/** Where a piece of data came from. Surfaced in the UI so nothing is implied. */
export type DataSource = "database" | "github";

export interface RepoCardData {
  githubId: number;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number | null;
  contributors: number | null;
  commitsLast90Days: number | null;
  goodFirstIssues: number | null;
  helpWantedIssues: number | null;
  closedIssues: number | null;
  medianIssueCloseHours: number | null;
  license: string | null;
  htmlUrl: string;
  homepage: string | null;
  defaultBranch: string;
  createdAt: string | null;
  pushedAt: string | null;
  updatedAt: string | null;
  archived: boolean;
  isFork: boolean;
  hasContributing: boolean | null;
  hasCodeOfConduct: boolean | null;
  hasReadme: boolean | null;
  /** Always present — the Vibe Score is computed even for thin search results. */
  vibe: VibeResult;
  source: DataSource;
  /** When the row was last synced into Supabase. `null` on the live path. */
  syncedAt: string | null;
}

export interface DiscoverResult {
  items: RepoCardData[];
  totalCount: number;
  page: number;
  perPage: number;
  pageCount: number;
  source: DataSource;
  /** Set when something went wrong but we can still render the page. */
  warning?: string;
  /** True when GitHub itself said the results are approximate. */
  incomplete?: boolean;
}

export interface IssueCardData {
  id: number;
  number: number;
  title: string;
  htmlUrl: string;
  repoFullName: string;
  labels: string[];
  comments: number;
  author: string | null;
  createdAt: string;
  updatedAt: string;
  isPullRequest: boolean;
  goodFirstIssue: boolean;
}

export interface IssueFeedResult {
  items: IssueCardData[];
  totalCount: number;
  page: number;
  perPage: number;
  pageCount: number;
  warning?: string;
}

export interface PullRequestCardData {
  id: number;
  number: number;
  title: string;
  htmlUrl: string;
  repoFullName: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  draft: boolean;
  labels: string[];
}
