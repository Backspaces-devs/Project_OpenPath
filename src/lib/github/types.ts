import { z } from 'zod';

export const GitHubUserSchema = z.object({
  id: z.number().optional(),
  login: z.string(),
  avatar_url: z.string().optional(),
  html_url: z.string().optional(),
  type: z.string().optional(),
});
export type GitHubUser = z.infer<typeof GitHubUserSchema>;

export const GitHubLabelSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  color: z.string().optional(),
  description: z.string().nullable().optional(),
});
export type GitHubLabel = z.infer<typeof GitHubLabelSchema>;

export const GitHubLicenseSchema = z.object({
  key: z.string(),
  name: z.string(),
  spdx_id: z.string().nullable().optional(),
}).nullable().optional();

export const GitHubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  owner: z.object({
    login: z.string(),
    id: z.number().optional(),
    avatar_url: z.string().optional(),
    html_url: z.string().optional(),
  }),
  description: z.string().nullable().optional(),
  html_url: z.string(),
  homepage: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  topics: z.array(z.string()).default([]),
  stargazers_count: z.number().default(0),
  forks_count: z.number().default(0),
  watchers_count: z.number().default(0),
  open_issues_count: z.number().default(0),
  license: GitHubLicenseSchema,
  size: z.number().default(0),
  archived: z.boolean().default(false),
  fork: z.boolean().default(false),
  pushed_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  default_branch: z.string().default('main'),
});
export type GitHubRepo = z.infer<typeof GitHubRepoSchema>;

export const GitHubIssueSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable().optional(),
  html_url: z.string(),
  state: z.string(),
  labels: z.array(z.union([z.string(), GitHubLabelSchema])).default([]),
  comments: z.number().default(0),
  user: GitHubUserSchema.nullable().optional(),
  assignee: GitHubUserSchema.nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable().optional(),
  pull_request: z.object({
    url: z.string().optional(),
    html_url: z.string().optional(),
    merged_at: z.string().nullable().optional(),
  }).optional(),
});
export type GitHubIssue = z.infer<typeof GitHubIssueSchema>;

export const GitHubPullSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  state: z.string(),
  html_url: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable().optional(),
  merged_at: z.string().nullable().optional(),
  user: GitHubUserSchema.nullable().optional(),
  merged: z.boolean().optional(),
  author_association: z.string().optional(),
});
export type GitHubPull = z.infer<typeof GitHubPullSchema>;

export const GitHubCommitSchema = z.object({
  sha: z.string(),
  commit: z.object({
    author: z.object({
      name: z.string().optional(),
      email: z.string().optional(),
      date: z.string().optional(),
    }).nullable().optional(),
    message: z.string(),
  }),
  author: GitHubUserSchema.nullable().optional(),
});
export type GitHubCommit = z.infer<typeof GitHubCommitSchema>;

export const GitHubContributorSchema = z.object({
  id: z.number().optional(),
  login: z.string(),
  avatar_url: z.string().optional(),
  contributions: z.number(),
});
export type GitHubContributor = z.infer<typeof GitHubContributorSchema>;

export const GitHubSearchRepoResultSchema = z.object({
  total_count: z.number(),
  incomplete_results: z.boolean(),
  items: z.array(GitHubRepoSchema),
});
export type GitHubSearchRepoResult = z.infer<typeof GitHubSearchRepoResultSchema>;

export const GitHubSearchIssueResultSchema = z.object({
  total_count: z.number(),
  incomplete_results: z.boolean(),
  items: z.array(GitHubIssueSchema),
});
export type GitHubSearchIssueResult = z.infer<typeof GitHubSearchIssueResultSchema>;
