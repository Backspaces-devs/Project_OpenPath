import { Octokit } from '@octokit/rest';
import { RateLimitError, GitHubApiError } from '@/lib/errors';
import { rateLimiter } from './rate-limiter';

export class GitHubClient {
  private tokens: string[] = [];
  private currentIndex: number = 0;
  private clients: Map<string, Octokit> = new Map();

  constructor() {
    this.initTokens();
  }

  private initTokens(): void {
    const pool = process.env.GITHUB_TOKEN_POOL || process.env.GITHUB_TOKEN || '';
    this.tokens = pool
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    for (const token of this.tokens) {
      this.clients.set(
        token,
        new Octokit({
          auth: token,
          userAgent: 'OpenPath-SourceMeUp/1.0',
        })
      );
    }
  }

  private getCurrentToken(): string {
    if (this.tokens.length === 0) {
      this.initTokens();
    }
    if (this.tokens.length === 0) {
      throw new Error(
        'No GitHub tokens configured. Please set GITHUB_TOKEN or GITHUB_TOKEN_POOL in your environment.'
      );
    }
    return this.tokens[this.currentIndex % this.tokens.length];
  }

  private rotateToken(): string {
    if (this.tokens.length <= 1) {
      return this.getCurrentToken();
    }
    this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
    console.info(`[GitHubClient] Rotated to token index ${this.currentIndex}`);
    return this.getCurrentToken();
  }

  private getClient(): Octokit {
    const token = this.getCurrentToken();
    let client = this.clients.get(token);
    if (!client) {
      client = new Octokit({
        auth: token,
        userAgent: 'OpenPath-SourceMeUp/1.0',
      });
      this.clients.set(token, client);
    }
    return client;
  }

  /**
   * Execute an Octokit operation with rate limiting, error handling, and token rotation
   */
  async execute<T>(
    operation: (octokit: Octokit, currentToken: string) => Promise<T>,
    options: { isSearch?: boolean } = {}
  ): Promise<T> {
    const isSearch = options.isSearch ?? false;
    let attempts = 0;
    const maxAttempts = Math.max(1, this.tokens.length);

    while (attempts < maxAttempts) {
      const token = this.getCurrentToken();

      if (isSearch) {
        await rateLimiter.waitForSearch();
      } else {
        await rateLimiter.waitForCore(token);
      }

      try {
        const client = this.getClient();
        return await operation(client, token);
      } catch (error: unknown) {
        const err = error as {
          status?: number;
          message?: string;
          response?: {
            status?: number;
            headers?: Record<string, string>;
          };
        };

        const status = err.status || err.response?.status;
        const remaining = err.response?.headers?.['x-ratelimit-remaining'];
        const resetHeader = err.response?.headers?.['x-ratelimit-reset'];

        // Rate limit exceeded (403 with 0 remaining or 429)
        if (status === 429 || (status === 403 && remaining === '0')) {
          attempts++;
          const resetTime = resetHeader ? parseInt(resetHeader, 10) * 1000 : undefined;
          const retryAfter = resetTime ? Math.max(0, Math.ceil((resetTime - Date.now()) / 1000)) : 60;

          console.warn(
            `[GitHubClient] Rate limit hit for token ${this.currentIndex + 1}/${this.tokens.length}. Retry after: ${retryAfter}s`
          );

          if (this.tokens.length > 1 && attempts < maxAttempts) {
            this.rotateToken();
            continue;
          }

          throw new RateLimitError(retryAfter);
        }

        // Other API errors
        if (status) {
          throw new GitHubApiError(err.message || 'GitHub API request failed', status);
        }

        throw error;
      }
    }

    throw new RateLimitError(60);
  }
}

export const githubClient = new GitHubClient();
