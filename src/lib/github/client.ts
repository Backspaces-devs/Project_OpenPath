import { z } from "zod";

import { GitHubApiError, RateLimitError, ValidationError } from "@/lib/errors";
import { describeIssues } from "@/lib/github/types";
import { readCache, writeCache } from "@/lib/github/cache";
import {
  ANONYMOUS_LIMITS,
  AUTHENTICATED_LIMITS,
  RateLimiter,
  type BucketName,
  type BucketSnapshot,
} from "@/lib/github/rate-limiter";
import { githubApiBaseUrl, githubTokenPool, githubUserAgent } from "@/lib/env";

export interface RequestOptions<S extends z.ZodTypeAny> {
  schema: S;
  query?: Record<string, string | number | boolean | undefined>;
  /** Which GitHub limit bucket this call draws from. Defaults to `core`. */
  bucket?: BucketName;
  /** Seconds. Passed through to Next.js `fetch` when running inside the app. */
  revalidate?: number;
  signal?: AbortSignal;
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  /** Skip the local token-bucket wait (used by the `/rate_limit` probe). */
  skipLimitWait?: boolean;
}

export interface GitHubResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export interface CachedResponse<T> {
  data: T;
  outcome: "miss" | "hit" | "revalidated";
}

export interface RawResponse {
  status: number;
  headers: Headers;
  body: unknown;
}

export interface TokenHealth {
  /** 1-based position in the pool; 0 means "anonymous". */
  index: number;
  label: string;
  remaining: number | null;
  resetAt: Date | null;
  exhausted: boolean;
}

export interface RateLimitSnapshot {
  core: { limit: number; remaining: number; resetAt: Date } | null;
  search: { limit: number; remaining: number; resetAt: Date } | null;
}

const GLOBAL_KEY = Symbol.for("openpath.github-client");

type Attempt =
  | { kind: "response"; response: Response }
  | { kind: "rotate"; resetAt: Date | null };

/**
 * Fetch-based GitHub client with round-robin token rotation and ETag support.
 *
 * Why not Octokit: we need per-request token rotation on `403 + remaining: 0`,
 * raw access to `x-ratelimit-*` headers, and 304 handling for the ETag cache.
 * Plain `fetch` also means the same client works in server components, route
 * handlers and plain `tsx` scripts without a runtime split.
 */
export class GitHubClient {
  readonly tokens: string[];
  private cursor = 0;
  private readonly limiter: RateLimiter;
  private readonly health = new Map<number, { remaining: number | null; resetAt: Date | null }>();
  private readonly baseUrl: string;
  private readonly userAgent: string;

  constructor(tokens: string[] = [], options: { baseUrl?: string; userAgent?: string } = {}) {
    this.tokens = tokens.filter((token) => token.length > 0);
    this.limiter = new RateLimiter(
      this.tokens.length > 0 ? AUTHENTICATED_LIMITS : ANONYMOUS_LIMITS,
    );
    this.baseUrl = options.baseUrl ?? githubApiBaseUrl();
    this.userAgent = options.userAgent ?? githubUserAgent();
  }

  get isAuthenticated(): boolean {
    return this.tokens.length > 0;
  }

  private rotate(): boolean {
    if (this.tokens.length === 0) return false;
    this.cursor = (this.cursor + 1) % this.tokens.length;
    return true;
  }

  private currentTokenIndex(): number {
    return this.tokens.length === 0 ? 0 : this.cursor;
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path.startsWith("http") ? path : `${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined) continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private authHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": this.userAgent,
      ...extra,
    };
    const token = this.tokens[this.currentTokenIndex()];
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  /** One network attempt. `rotate` means this token is dry — move on. */
  private async perform(
    url: string,
    options: {
      bucket: BucketName;
      signal?: AbortSignal;
      revalidate?: number;
      method: "GET" | "HEAD";
      headers?: Record<string, string>;
      skipLimitWait?: boolean;
    },
  ): Promise<Attempt> {
    if (!options.skipLimitWait) {
      await this.limiter.acquire(options.bucket, options.signal);
    }

    const init: RequestInit & { next?: { revalidate?: number } } = {
      method: options.method,
      headers: this.authHeaders(options.headers),
      signal: options.signal,
    };
    if (typeof options.revalidate === "number") init.next = { revalidate: options.revalidate };

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      throw new GitHubApiError(`Network request to GitHub failed: ${errorText(error)}`, {
        status: 0,
        url,
        cause: error,
      });
    }

    this.recordHeaders(options.bucket, response.headers);

    if (response.status === 304) return { kind: "response", response };

    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      const reset = response.headers.get("x-ratelimit-reset");
      const resetAt = reset && !Number.isNaN(Number(reset)) ? new Date(Number(reset) * 1000) : null;

      if (remaining === "0" || response.status === 429) {
        this.limiter.drain(options.bucket);
        return { kind: "rotate", resetAt };
      }
    }

    return { kind: "response", response };
  }

  private rateLimitError(bucket: BucketName): RateLimitError {
    const resetAt = this.earliestReset();
    return new RateLimitError(
      this.tokens.length > 0
        ? `All ${this.tokens.length} GitHub token(s) in the pool are rate limited.`
        : "GitHub's anonymous rate limit is exhausted (60 requests/hour per IP).",
      {
        resetAt,
        bucket,
        hint:
          this.tokens.length > 0
            ? "Add another PAT to GITHUB_TOKEN_POOL, or wait for the window to reset."
            : "Create a free Personal Access Token and set GITHUB_TOKEN_POOL — that raises the ceiling to 5,000 requests/hour.",
      },
    );
  }

  private recordHeaders(bucket: BucketName, headers: Headers): void {
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");
    if (remaining !== null && reset !== null && !Number.isNaN(Number(reset))) {
      const resetAt = new Date(Number(reset) * 1000);
      this.limiter.syncFromHeaders(bucket, Number(remaining), resetAt);
      this.health.set(this.currentTokenIndex(), { remaining: Number(remaining), resetAt });
    }
  }

  /**
   * Validated request. Rotates tokens whenever one runs dry and throws
   * `RateLimitError` once every token has been tried.
   */
  async request<T>(path: string, options: RequestOptions<z.ZodType<T>>): Promise<GitHubResponse<T>> {
    const url = this.buildUrl(path, options.query);
    const bucket = options.bucket ?? "core";
    const attempts = Math.max(1, this.tokens.length);

    for (let i = 0; i < attempts; i++) {
      const attempt = await this.perform(url, {
        bucket,
        signal: options.signal,
        revalidate: options.revalidate,
        method: options.method ?? "GET",
        headers: options.headers,
        skipLimitWait: options.skipLimitWait,
      });

      if (attempt.kind === "rotate") {
        if (!this.rotate()) break;
        continue;
      }

      const { response } = attempt;
      return {
        data: await parseBody(response, options.schema, url),
        status: response.status,
        headers: response.headers,
      };
    }

    throw this.rateLimitError(bucket);
  }

  /**
   * Like `request`, but returns the raw body and passes 304 through untouched —
   * the building block for the ETag cache.
   */
  async requestRaw(
    path: string,
    options: Omit<RequestOptions<z.ZodTypeAny>, "schema"> & { schema?: never } = {} as never,
  ): Promise<RawResponse> {
    const url = this.buildUrl(path, options.query);
    const bucket = options.bucket ?? "core";
    const attempts = Math.max(1, this.tokens.length);

    for (let i = 0; i < attempts; i++) {
      const attempt = await this.perform(url, {
        bucket,
        signal: options.signal,
        revalidate: options.revalidate,
        method: options.method ?? "GET",
        headers: options.headers,
        skipLimitWait: options.skipLimitWait,
      });

      if (attempt.kind === "rotate") {
        if (!this.rotate()) break;
        continue;
      }

      const { response } = attempt;

      if (response.status === 304) {
        return { status: 304, headers: response.headers, body: null };
      }

      if (response.status >= 400) {
        const body = await safeText(response);
        throw new GitHubApiError(
          `GitHub returned ${response.status} for ${url}. ${trimTo(body, 200)}`,
          {
            status: response.status,
            url,
            responseBody: body,
            hint:
              response.status === 401
                ? "Token is invalid or revoked. Generate a new PAT and update GITHUB_TOKEN_POOL."
                : response.status === 403
                  ? "The token may be missing a scope. `public_repo` is enough for OpenPath."
                  : undefined,
          },
        );
      }

      const body = await response.json().catch(() => null);
      return { status: response.status, headers: response.headers, body };
    }

    throw this.rateLimitError(bucket);
  }

  /**
   * ETag-cached request.
   *
   * 1. Fresh cached copy inside `maxAgeMs` → returned without a network call.
   * 2. Otherwise send `If-None-Match`; a 304 reuses the stored body.
   * 3. A 200 validates against `schema` and refreshes the cache.
   *
   * Conditional requests that return 304 do **not** count against the GitHub
   * rate limit, which is what makes the 6-hourly sync cheap.
   */
  async requestCached<T>(
    path: string,
    options: RequestOptions<z.ZodType<T>> & { key: string; maxAgeMs?: number },
  ): Promise<CachedResponse<T>> {
    const { key, maxAgeMs = 15 * 60 * 1000 } = options;
    const cached = await readCache(key);

    if (cached?.data !== null && cached !== null && Date.now() - Date.parse(cached.fetchedAt) < maxAgeMs) {
      const parsed = options.schema.safeParse(cached.data);
      if (parsed.success) return { data: parsed.data as T, outcome: "hit" };
    }

    const response = await this.requestRaw(path, {
      query: options.query,
      bucket: options.bucket,
      headers: cached?.etag ? { "If-None-Match": cached.etag } : undefined,
      signal: options.signal,
    });

    if (response.status === 304 && cached && cached.data !== null) {
      const parsed = options.schema.safeParse(cached.data);
      if (parsed.success) {
        await writeCache(key, { etag: cached.etag, data: cached.data });
        return { data: parsed.data as T, outcome: "revalidated" };
      }
    }

    const parsed = options.schema.safeParse(response.body);
    if (!parsed.success) {
      throw new ValidationError(
        `GitHub response for ${path} did not match the expected schema.`,
        describeIssues(parsed.error),
      );
    }

    await writeCache(key, { etag: response.headers.get("etag"), data: parsed.data });
    return { data: parsed.data as T, outcome: "miss" };
  }

  /** Live rate-limit counters straight from GitHub. Used by /settings. */
  async rateLimit(): Promise<RateLimitSnapshot> {
    const { GitHubRateLimitSchema } = await import("@/lib/github/types");
    try {
      const response = await this.request("/rate_limit", {
        schema: GitHubRateLimitSchema,
        bucket: "core",
        skipLimitWait: true,
      });
      return {
        core: {
          limit: response.data.resources.core.limit,
          remaining: response.data.resources.core.remaining,
          resetAt: new Date(response.data.resources.core.reset * 1000),
        },
        search: {
          limit: response.data.resources.search.limit,
          remaining: response.data.resources.search.remaining,
          resetAt: new Date(response.data.resources.search.reset * 1000),
        },
      };
    } catch {
      return { core: null, search: null };
    }
  }

  /** Local token-bucket state (what we have budgeted, not what GitHub reports). */
  localBuckets(): BucketSnapshot[] {
    return this.limiter.snapshot();
  }

  tokenHealth(): TokenHealth[] {
    if (this.tokens.length === 0) {
      const entry = this.health.get(0);
      return [
        {
          index: 0,
          label: "anonymous",
          remaining: entry?.remaining ?? null,
          resetAt: entry?.resetAt ?? null,
          exhausted: entry?.remaining === 0,
        },
      ];
    }
    return this.tokens.map((token, index) => {
      const entry = this.health.get(index);
      return {
        index: index + 1,
        label: `token ${index + 1} · …${token.slice(-4)}`,
        remaining: entry?.remaining ?? null,
        resetAt: entry?.resetAt ?? null,
        exhausted: entry?.remaining === 0,
      };
    });
  }

  private earliestReset(): Date | null {
    let earliest: Date | null = null;
    for (const entry of this.health.values()) {
      if (entry.resetAt && (!earliest || entry.resetAt < earliest)) earliest = entry.resetAt;
    }
    return earliest;
  }
}

async function parseBody<T>(response: Response, schema: z.ZodType<T>, url: string): Promise<T> {
  if (response.status >= 400) {
    const body = await safeText(response);
    throw new GitHubApiError(`GitHub returned ${response.status} for ${url}. ${trimTo(body, 200)}`, {
      status: response.status,
      url,
      responseBody: body,
    });
  }
  const payload = await response.json().catch(() => undefined);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ValidationError(
      `GitHub response for ${url} did not match the expected schema.`,
      describeIssues(parsed.error),
    );
  }
  return parsed.data;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function trimTo(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/** Process-wide client, cached on `globalThis` so HMR never resets the buckets. */
export function getGitHubClient(): GitHubClient {
  const store = globalThis as unknown as Record<symbol, GitHubClient | undefined>;
  const existing = store[GLOBAL_KEY];
  if (existing) return existing;
  const client = new GitHubClient(githubTokenPool());
  store[GLOBAL_KEY] = client;
  return client;
}
