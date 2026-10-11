import { z } from "zod";

/**
 * Runtime contracts for every GitHub payload we touch. Nothing crosses from the
 * network into the app without passing one of these schemas.
 */

export const GitHubOwnerSchema = z.object({
  login: z.string(),
  id: z.number(),
  avatar_url: z.string().nullish(),
  html_url: z.string().nullish(),
  type: z.string().nullish(),
});
export type GitHubOwner = z.infer<typeof GitHubOwnerSchema>;

export const GitHubLicenseSchema = z.object({
  key: z.string(),
  name: z.string(),
  spdx_id: z.string().nullish(),
  url: z.string().nullish(),
});
export type GitHubLicense = z.infer<typeof GitHubLicenseSchema>;

export const GitHubRepositorySchema = z.object({
  id: z.number(),
  node_id: z.string().nullish(),
  name: z.string(),
  full_name: z.string(),
  owner: GitHubOwnerSchema,
  html_url: z.string(),
  description: z.string().nullish(),
  fork: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
  pushed_at: z.string(),
  homepage: z.string().nullish(),
  size: z.number().default(0),
  stargazers_count: z.number().default(0),
  watchers_count: z.number().default(0),
  language: z.string().nullish(),
  forks_count: z.number().default(0),
  open_issues_count: z.number().default(0),
  subscribers_count: z.number().nullish(),
  topics: z.array(z.string()).default([]),
  license: GitHubLicenseSchema.nullish(),
  archived: z.boolean().default(false),
  disabled: z.boolean().default(false),
  default_branch: z.string().default("main"),
  has_issues: z.boolean().default(true),
  has_discussions: z.boolean().default(false),
  visibility: z.string().default("public"),
});
export type GitHubRepository = z.infer<typeof GitHubRepositorySchema>;

export const GitHubSearchReposResponseSchema = z.object({
  total_count: z.number(),
  incomplete_results: z.boolean().default(false),
  items: z.array(GitHubRepositorySchema),
});
export type GitHubSearchReposResponse = z.infer<typeof GitHubSearchReposResponseSchema>;

export const GitHubLabelSchema = z.object({
  id: z.number().nullish(),
  name: z.string(),
  color: z.string().nullish(),
  description: z.string().nullish(),
});

export const GitHubIssueSchema = z.object({
  id: z.number(),
  node_id: z.string().nullish(),
  number: z.number(),
  title: z.string(),
  html_url: z.string(),
  state: z.string().default("open"),
  state_reason: z.string().nullish(),
  user: GitHubOwnerSchema.nullish(),
  labels: z.array(GitHubLabelSchema).default([]),
  comments: z.number().default(0),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullish(),
  body: z.string().nullish(),
  draft: z.boolean().default(false),
  pull_request: z
    .object({
      url: z.string().nullish(),
      html_url: z.string().nullish(),
      merged_at: z.string().nullish(),
    })
    .nullish(),
  repository_url: z.string().nullish(),
});
export type GitHubIssue = z.infer<typeof GitHubIssueSchema>;

export const GitHubSearchIssuesResponseSchema = z.object({
  total_count: z.number(),
  incomplete_results: z.boolean().default(false),
  items: z.array(GitHubIssueSchema),
});
export type GitHubSearchIssuesResponse = z.infer<typeof GitHubSearchIssuesResponseSchema>;

export const GitHubCommitSchema = z.object({
  sha: z.string(),
  commit: z
    .object({
      message: z.string().nullish(),
      author: z
        .object({
          name: z.string().nullish(),
          email: z.string().nullish(),
          date: z.string().nullish(),
        })
        .nullish(),
      committer: z
        .object({
          date: z.string().nullish(),
        })
        .nullish(),
    })
    .nullish(),
  author: GitHubOwnerSchema.nullish(),
});
export type GitHubCommit = z.infer<typeof GitHubCommitSchema>;

export const GitHubContributorSchema = z.object({
  login: z.string(),
  id: z.number(),
  avatar_url: z.string().nullish(),
  html_url: z.string().nullish(),
  contributions: z.number().default(0),
  type: z.string().nullish(),
});
export type GitHubContributor = z.infer<typeof GitHubContributorSchema>;

const RateLimitResourceSchema = z.object({
  limit: z.number(),
  remaining: z.number(),
  reset: z.number(),
  used: z.number().default(0),
});

export const GitHubRateLimitSchema = z.object({
  resources: z.object({
    core: RateLimitResourceSchema,
    search: RateLimitResourceSchema,
  }),
  rate: RateLimitResourceSchema.nullish(),
});
export type GitHubRateLimit = z.infer<typeof GitHubRateLimitSchema>;

export const GitHubContentSchema = z.object({
  name: z.string(),
  path: z.string(),
  sha: z.string(),
  size: z.number().default(0),
  type: z.string(),
  encoding: z.string().nullish(),
  content: z.string().nullish(),
  download_url: z.string().nullish(),
});
export type GitHubContent = z.infer<typeof GitHubContentSchema>;

/** Turn a Zod error into something we can log and show. */
export function describeIssues(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join(".") || "(root)",
    message: issue.message,
  }));
}
