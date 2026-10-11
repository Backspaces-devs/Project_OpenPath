/**
 * Base application error
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * GitHub API rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(public retryAfter?: number) {
    super('GitHub API rate limit exceeded', 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * GitHub API general error
 */
export class GitHubApiError extends AppError {
  constructor(message: string, public status: number) {
    super(message, 'GITHUB_API', status);
    this.name = 'GitHubApiError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, public errors?: Record<string, string[]>) {
    super(message, 'VALIDATION', 400);
    this.name = 'ValidationError';
  }
}

/**
 * Sync error
 */
export class SyncError extends AppError {
  constructor(message: string, public repoFullName?: string) {
    super(message, 'SYNC', 500);
    this.name = 'SyncError';
  }
}
