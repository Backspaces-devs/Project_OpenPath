/**
 * Row shapes for every table in `supabase/migrations`.
 *
 * These mirror the SQL 1:1. If you add a column in a migration, add it here too.
 * Kept hand-written on purpose — no codegen step to run out of sync.
 */

export type SyncStatus = "pending" | "synced" | "failed";

export interface RepositoryRow {
  id: string;
  github_id: number;
  node_id: string | null;
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  homepage: string | null;
  html_url: string;
  default_branch: string;
  primary_language: string | null;
  topics: string[];
  license_spdx: string | null;
  stars: number;
  forks: number;
  watchers: number;
  open_issues: number;
  subscribers: number | null;
  contributors_count: number | null;
  commits_last_90d: number | null;
  commits_last_year: number | null;
  closed_issues: number | null;
  merged_pull_requests: number | null;
  median_issue_close_hours: number | null;
  good_first_issues: number;
  help_wanted_issues: number;
  has_readme: boolean | null;
  has_contributing: boolean | null;
  has_code_of_conduct: boolean | null;
  has_license: boolean | null;
  is_archived: boolean;
  is_fork: boolean;
  is_template: boolean;
  repo_created_at: string | null;
  pushed_at: string | null;
  repo_updated_at: string | null;
  vibe_score: number | null;
  vibe_breakdown: Record<string, unknown> | null;
  vibe_confidence: number | null;
  vibe_computed_at: string | null;
  sync_status: SyncStatus;
  sync_error: string | null;
  last_synced_at: string | null;
  inserted_at: string;
  refreshed_at: string;
}

export interface IssueRow {
  id: string;
  github_id: number;
  repo_id: string | null;
  repo_full_name: string | null;
  number: number;
  title: string;
  body: string | null;
  state: string;
  is_pull_request: boolean;
  labels: string[];
  is_good_first_issue: boolean;
  is_help_wanted: boolean;
  comments: number;
  author: string | null;
  html_url: string;
  github_created_at: string | null;
  github_updated_at: string | null;
  closed_at: string | null;
  synced_at: string;
}

export interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  github_username: string | null;
  bio: string | null;
  skills: string[];
  preferred_languages: string[];
  experience_level: string | null;
  timezone: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollectionRow {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollectionItemRow {
  id: string;
  collection_id: string;
  repo_id: string;
  note: string | null;
  position: number;
  created_at: string;
}

export type ContributionType = "pr" | "issue" | "review" | "commit";

export interface ContributionRow {
  id: string;
  user_id: string;
  repo_id: string | null;
  repo_full_name: string | null;
  type: ContributionType;
  github_id: number | null;
  title: string | null;
  url: string | null;
  state: string | null;
  merged_at: string | null;
  created_at: string;
}

export interface StudentProjectRow {
  id: string;
  owner_id: string;
  repo_id: string | null;
  title: string;
  summary: string;
  difficulty: "starter" | "intermediate" | "advanced" | null;
  stack: string[];
  slots: number;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectApplicationRow {
  id: string;
  project_id: string;
  applicant_id: string;
  message: string | null;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  created_at: string;
  updated_at: string;
}

export interface RepoQuestionRow {
  id: string;
  repo_id: string | null;
  repo_full_name: string;
  author_id: string;
  title: string;
  body: string;
  is_resolved: boolean;
  upvotes: number;
  created_at: string;
  updated_at: string;
}

export interface RepoAnswerRow {
  id: string;
  question_id: string;
  author_id: string;
  body: string;
  is_accepted: boolean;
  upvotes: number;
  created_at: string;
  updated_at: string;
}

export interface QuestRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  difficulty: "starter" | "intermediate" | "advanced";
  xp: number;
  criteria: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface UserQuestRow {
  id: string;
  user_id: string;
  quest_id: string;
  status: "active" | "completed" | "abandoned";
  progress: Record<string, unknown> | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncLogRow {
  id: string;
  job: string;
  status: "running" | "success" | "failed";
  repos_processed: number;
  repos_failed: number;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  meta: Record<string, unknown> | null;
}

export interface RepoEmbeddingRow {
  id: string;
  repo_id: string;
  content: string;
  embedding: number[] | null;
  model: string | null;
  created_at: string;
}

export interface GithubCacheRow {
  cache_key: string;
  etag: string | null;
  data: unknown;
  fetched_at: string;
}

export const TABLES = {
  repositories: "repositories",
  issues: "issues",
  profiles: "profiles",
  collections: "collections",
  collectionItems: "collection_items",
  contributions: "contributions",
  studentProjects: "student_projects",
  projectApplications: "project_applications",
  repoQuestions: "repo_questions",
  repoAnswers: "repo_answers",
  quests: "quests",
  userQuests: "user_quests",
  syncLog: "sync_log",
  repoEmbeddings: "repo_embeddings",
  githubCache: "github_cache",
} as const;
