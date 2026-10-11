/**
 * Typed errors for the whole app. Every error thrown by the data layer is one of
 * these so pages can render a specific, useful message instead of a stack trace.
 */

export class AppError extends Error {
  readonly code: string;
  readonly hint?: string;

  constructor(message: string, options: { code: string; hint?: string; cause?: unknown } = { code: "app_error" }) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code;
    this.hint = options.hint;
  }
}

/** Missing or invalid environment configuration. */
export class ConfigurationError extends AppError {
  constructor(message: string, hint?: string) {
    super(message, { code: "configuration_error", hint });
  }
}

/** GitHub rate limit exhausted across every token in the pool. */
export class RateLimitError extends AppError {
  readonly resetAt: Date | null;
  readonly bucket: string;

  constructor(
    message = "GitHub rate limit exhausted on every available token.",
    options: { resetAt?: Date | null; bucket?: string; hint?: string } = {},
  ) {
    super(message, {
      code: "rate_limit_error",
      hint: options.hint ?? "Add another token to GITHUB_TOKEN_POOL, or wait for the window to reset.",
    });
    this.resetAt = options.resetAt ?? null;
    this.bucket = options.bucket ?? "core";
  }
}

/** Non-2xx response from the GitHub API. */
export class GitHubApiError extends AppError {
  readonly status: number;
  readonly url?: string;
  readonly responseBody?: string;

  constructor(
    message: string,
    options: { status: number; url?: string; responseBody?: string; hint?: string; cause?: unknown } = { status: 0 },
  ) {
    super(message, {
      code: "github_api_error",
      hint: options.hint,
      cause: options.cause,
    });
    this.status = options.status;
    this.url = options.url;
    this.responseBody = options.responseBody;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}

/** Zod schema rejected the payload. */
export class ValidationError extends AppError {
  readonly issues: Array<{ path: string; message: string }>;

  constructor(message: string, issues: Array<{ path: string; message: string }> = []) {
    super(message, { code: "validation_error" });
    this.issues = issues;
  }
}

/** A seed/sync job failed. */
export class SyncError extends AppError {
  readonly repo?: string;

  constructor(message: string, options: { repo?: string; cause?: unknown } = {}) {
    super(message, { code: "sync_error", cause: options.cause });
    this.repo = options.repo;
  }
}

/** Normalise anything thrown into an AppError, preserving the original type. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError(error.message, { code: "unknown_error", cause: error });
  }
  return new AppError(String(error), { code: "unknown_error" });
}

/** True when the error is safe to show a "no credentials" hint for. */
export function isConfigurationError(error: unknown): boolean {
  return error instanceof ConfigurationError;
}
