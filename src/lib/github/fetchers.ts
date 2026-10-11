import { githubClient } from './client';
import { githubCache } from './cache';
import {
  GitHubRepoSchema,
  GitHubSearchRepoResultSchema,
  GitHubIssueSchema,
  GitHubPullSchema,
  GitHubCommitSchema,
  GitHubContributorSchema,
  type GitHubRepo,
  type GitHubSearchRepoResult,
  type GitHubIssue,
  type GitHubPull,
  type GitHubCommit,
  type GitHubContributor,
} from './types';
import { z } from 'zod';

/**
 * Searches repositories with caching and rate limiting
 */
export async function searchRepositories(
  query: string,
  page: number = 1,
  perPage: number = 30
): Promise<GitHubSearchRepoResult> {
  const cacheKey = `search:repo:${query}:p${page}:pp${perPage}`;
  const cached = await githubCache.get<GitHubSearchRepoResult>(cacheKey);

  return await githubClient.execute(
    async (octokit) => {
      const headers: Record<string, string> = {};
      if (cached?.etag) {
        headers['if-none-match'] = cached.etag;
      }

      try {
        const response = await octokit.rest.search.repos({
          q: query,
          page,
          per_page: perPage,
          headers,
        });

        const validated = GitHubSearchRepoResultSchema.parse(response.data);
        const etag = response.headers.etag || null;
        await githubCache.set(cacheKey, etag, validated);
        return validated;
      } catch (err: unknown) {
        const error = err as { status?: number };
        if (error.status === 304 && cached) {
          return cached.data;
        }
        throw err;
      }
    },
    { isSearch: true }
  );
}

/**
 * Gets a single repository with ETag caching
 */
export async function getRepository(owner: string, repo: string): Promise<GitHubRepo> {
  const cacheKey = `repo:${owner}/${repo}`;
  const cached = await githubCache.get<GitHubRepo>(cacheKey);

  return await githubClient.execute(async (octokit) => {
    const headers: Record<string, string> = {};
    if (cached?.etag) {
      headers['if-none-match'] = cached.etag;
    }

    try {
      const response = await octokit.rest.repos.get({
        owner,
        repo,
        headers,
      });

      const validated = GitHubRepoSchema.parse(response.data);
      const etag = response.headers.etag || null;
      await githubCache.set(cacheKey, etag, validated);
      return validated;
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error.status === 304 && cached) {
        return cached.data;
      }
      throw err;
    }
  });
}

/**
 * Gets language breakdown for a repository
 */
export async function getRepoLanguages(
  owner: string,
  repo: string
): Promise<Record<string, number>> {
  const cacheKey = `repo:${owner}/${repo}:languages`;
  const cached = await githubCache.get<Record<string, number>>(cacheKey);

  return await githubClient.execute(async (octokit) => {
    const headers: Record<string, string> = {};
    if (cached?.etag) {
      headers['if-none-match'] = cached.etag;
    }

    try {
      const response = await octokit.rest.repos.listLanguages({
        owner,
        repo,
        headers,
      });

      const validated = z.record(z.string(), z.number()).parse(response.data);
      const etag = response.headers.etag || null;
      await githubCache.set(cacheKey, etag, validated);
      return validated;
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error.status === 304 && cached) {
        return cached.data;
      }
      throw err;
    }
  });
}

/**
 * Gets issues for a repository
 */
export async function getRepoIssues(
  owner: string,
  repo: string,
  options: {
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    perPage?: number;
    page?: number;
  } = {}
): Promise<GitHubIssue[]> {
  const { state = 'open', labels, perPage = 30, page = 1 } = options;
  const cacheKey = `repo:${owner}/${repo}:issues:s${state}:l${labels || 'none'}:p${page}:pp${perPage}`;
  const cached = await githubCache.get<GitHubIssue[]>(cacheKey);

  return await githubClient.execute(async (octokit) => {
    const headers: Record<string, string> = {};
    if (cached?.etag) {
      headers['if-none-match'] = cached.etag;
    }

    try {
      const response = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state,
        labels,
        per_page: perPage,
        page,
        headers,
      });

      const validated = z.array(GitHubIssueSchema).parse(response.data);
      const etag = response.headers.etag || null;
      await githubCache.set(cacheKey, etag, validated);
      return validated;
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error.status === 304 && cached) {
        return cached.data;
      }
      throw err;
    }
  });
}

/**
 * Gets pull requests for a repository
 */
export async function getRepoPulls(
  owner: string,
  repo: string,
  options: {
    state?: 'open' | 'closed' | 'all';
    perPage?: number;
    page?: number;
  } = {}
): Promise<GitHubPull[]> {
  const { state = 'all', perPage = 30, page = 1 } = options;
  const cacheKey = `repo:${owner}/${repo}:pulls:s${state}:p${page}:pp${perPage}`;
  const cached = await githubCache.get<GitHubPull[]>(cacheKey);

  return await githubClient.execute(async (octokit) => {
    const headers: Record<string, string> = {};
    if (cached?.etag) {
      headers['if-none-match'] = cached.etag;
    }

    try {
      const response = await octokit.rest.pulls.list({
        owner,
        repo,
        state,
        per_page: perPage,
        page,
        headers,
      });

      const validated = z.array(GitHubPullSchema).parse(response.data);
      const etag = response.headers.etag || null;
      await githubCache.set(cacheKey, etag, validated);
      return validated;
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error.status === 304 && cached) {
        return cached.data;
      }
      throw err;
    }
  });
}

/**
 * Gets recent commits for a repository
 */
export async function getRepoCommits(
  owner: string,
  repo: string,
  since?: string
): Promise<GitHubCommit[]> {
  const cacheKey = `repo:${owner}/${repo}:commits:since${since || 'all'}`;
  const cached = await githubCache.get<GitHubCommit[]>(cacheKey);

  return await githubClient.execute(async (octokit) => {
    const headers: Record<string, string> = {};
    if (cached?.etag) {
      headers['if-none-match'] = cached.etag;
    }

    try {
      const response = await octokit.rest.repos.listCommits({
        owner,
        repo,
        since,
        per_page: 50,
        headers,
      });

      const validated = z.array(GitHubCommitSchema).parse(response.data);
      const etag = response.headers.etag || null;
      await githubCache.set(cacheKey, etag, validated);
      return validated;
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error.status === 304 && cached) {
        return cached.data;
      }
      throw err;
    }
  });
}

/**
 * Gets repository contributors
 */
export async function getRepoContributors(
  owner: string,
  repo: string
): Promise<GitHubContributor[]> {
  const cacheKey = `repo:${owner}/${repo}:contributors`;
  const cached = await githubCache.get<GitHubContributor[]>(cacheKey);

  return await githubClient.execute(async (octokit) => {
    const headers: Record<string, string> = {};
    if (cached?.etag) {
      headers['if-none-match'] = cached.etag;
    }

    try {
      const response = await octokit.rest.repos.listContributors({
        owner,
        repo,
        per_page: 50,
        headers,
      });

      const validated = z.array(GitHubContributorSchema).parse(response.data);
      const etag = response.headers.etag || null;
      await githubCache.set(cacheKey, etag, validated);
      return validated;
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error.status === 304 && cached) {
        return cached.data;
      }
      throw err;
    }
  });
}

/**
 * Checks if a file exists in the repository (e.g. CONTRIBUTING.md, CODE_OF_CONDUCT.md)
 */
export async function checkFileExists(
  owner: string,
  repo: string,
  path: string
): Promise<boolean> {
  const cacheKey = `repo:${owner}/${repo}:file_exists:${path}`;
  const cached = await githubCache.get<boolean>(cacheKey);

  if (cached !== null) {
    return cached.data;
  }

  return await githubClient.execute(async (octokit) => {
    try {
      await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });
      await githubCache.set(cacheKey, null, true);
      return true;
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error.status === 404) {
        await githubCache.set(cacheKey, null, false);
        return false;
      }
      throw err;
    }
  });
}

/**
 * Gets file content as text (e.g. README.md, CONTRIBUTING.md)
 */
export async function getFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  const cacheKey = `repo:${owner}/${repo}:file_content:${path}`;
  const cached = await githubCache.get<string>(cacheKey);

  if (cached !== null) {
    return cached.data;
  }

  return await githubClient.execute(async (octokit) => {
    try {
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if ('content' in response.data && typeof response.data.content === 'string') {
        const text = Buffer.from(response.data.content, 'base64').toString('utf-8');
        await githubCache.set(cacheKey, null, text);
        return text;
      }
      return null;
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error.status === 404) {
        await githubCache.set(cacheKey, null, null);
        return null;
      }
      throw err;
    }
  });
}
