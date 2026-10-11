import { sleep } from "@/lib/utils";

export type BucketName = "search" | "core";

export interface BucketLimit {
  /** How many requests fit in the window. */
  capacity: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/**
 * GitHub's documented ceilings:
 *  - Search API: 30 requests/minute authenticated, 10/minute anonymous.
 *  - Core API:   5,000 requests/hour per token, 60/hour anonymous.
 * We budget slightly under the ceiling so a stray parallel request never tips
 * us over the edge.
 */
export const AUTHENTICATED_LIMITS: Record<BucketName, BucketLimit> = {
  search: { capacity: 25, windowMs: 60_000 },
  core: { capacity: 4_500, windowMs: 3_600_000 },
};

export const ANONYMOUS_LIMITS: Record<BucketName, BucketLimit> = {
  search: { capacity: 9, windowMs: 60_000 },
  core: { capacity: 55, windowMs: 3_600_000 },
};

interface BucketState {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillPerMs: number;
}

export interface BucketSnapshot {
  name: BucketName;
  remaining: number;
  capacity: number;
  /** Milliseconds until at least one more token is available. */
  msUntilNext: number;
}

/**
 * Per-process token bucket. It paces outgoing requests so we stay inside
 * GitHub's limits without ever needing to read a 403 first.
 */
export class RateLimiter {
  private readonly buckets = new Map<BucketName, BucketState>();

  constructor(limits: Record<BucketName, BucketLimit> = AUTHENTICATED_LIMITS) {
    for (const [name, limit] of Object.entries(limits) as Array<[BucketName, BucketLimit]>) {
      this.buckets.set(name, {
        tokens: limit.capacity,
        lastRefill: Date.now(),
        capacity: limit.capacity,
        refillPerMs: limit.capacity / limit.windowMs,
      });
    }
  }

  private refill(bucket: BucketState, now: number): void {
    const elapsed = Math.max(0, now - bucket.lastRefill);
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + elapsed * bucket.refillPerMs);
    bucket.lastRefill = now;
  }

  /** Wait until a slot is free, then consume it. */
  async acquire(name: BucketName, signal?: AbortSignal): Promise<void> {
    const bucket = this.buckets.get(name);
    if (!bucket) return;

    for (;;) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const now = Date.now();
      this.refill(bucket, now);

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return;
      }

      const waitMs = Math.ceil((1 - bucket.tokens) / bucket.refillPerMs) + 5;
      await sleep(Math.min(waitMs, 60_000));
    }
  }

  /**
   * Sync a bucket with what GitHub just told us. Called with the
   * `x-ratelimit-*` headers so the local bucket never drifts from reality.
   */
  syncFromHeaders(name: BucketName, remaining: number, resetAt: Date): void {
    const bucket = this.buckets.get(name);
    if (!bucket) return;
    const msUntilReset = resetAt.getTime() - Date.now();
    if (msUntilReset <= 0) return;
    const refillPerMs = Math.max(remaining, 0) / msUntilReset;
    bucket.tokens = Math.min(bucket.tokens, Math.max(remaining, 0));
    bucket.refillPerMs = Math.max(bucket.refillPerMs, refillPerMs);
  }

  /** Hard-set a bucket to empty (used when a token is exhausted). */
  drain(name: BucketName): void {
    const bucket = this.buckets.get(name);
    if (bucket) bucket.tokens = 0;
  }

  snapshot(): BucketSnapshot[] {
    const now = Date.now();
    return Array.from(this.buckets.entries()).map(([name, bucket]) => {
      this.refill(bucket, now);
      const remaining = Math.floor(bucket.tokens);
      return {
        name,
        remaining,
        capacity: bucket.capacity,
        msUntilNext: remaining >= 1 ? 0 : Math.ceil((1 - bucket.tokens) / bucket.refillPerMs),
      };
    });
  }
}
