import { sleep } from '@/lib/utils';

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillRatePerMs: number
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed > 0) {
      const addedTokens = elapsed * this.refillRatePerMs;
      this.tokens = Math.min(this.capacity, this.tokens + addedTokens);
      this.lastRefill = now;
    }
  }

  async acquire(cost: number = 1): Promise<void> {
    while (true) {
      this.refill();
      if (this.tokens >= cost) {
        this.tokens -= cost;
        return;
      }

      // Calculate time needed to obtain enough tokens
      const needed = cost - this.tokens;
      const waitMs = Math.ceil(needed / this.refillRatePerMs);
      await sleep(Math.max(100, Math.min(waitMs, 5000)));
    }
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

export class RateLimiter {
  // GitHub search limit: 30 requests per minute -> capped at 25 req/min (1 every 2400ms)
  private searchBucket: TokenBucket;

  // GitHub core API limit: 5000 requests per hour -> capped at 4500 req/hour (1 every 800ms) per token
  private coreBuckets: Map<string, TokenBucket> = new Map();

  constructor() {
    // 25 tokens capacity, 25 tokens per 60,000ms
    this.searchBucket = new TokenBucket(25, 25 / 60000);
  }

  async waitForSearch(): Promise<void> {
    await this.searchBucket.acquire(1);
  }

  async waitForCore(tokenId: string): Promise<void> {
    let bucket = this.coreBuckets.get(tokenId);
    if (!bucket) {
      // 4500 tokens capacity, 4500 tokens per 3,600,000ms
      bucket = new TokenBucket(4500, 4500 / 3600000);
      this.coreBuckets.set(tokenId, bucket);
    }
    await bucket.acquire(1);
  }
}

export const rateLimiter = new RateLimiter();
