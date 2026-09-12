/**
 * A small in-memory fixed-window rate limiter.
 *
 * Deliberately modest: Vercel functions are serverless, so this store lives in
 * one instance's memory and is reset by a cold start. That is fine for the job
 * it has here — stopping a stranger from pointing a `curl` loop at an
 * unauthenticated LLM proxy and draining the OpenRouter credit — and it is a
 * lot less machinery than an external store. Where a hard guarantee is needed,
 * pair it with a platform-level rule (see `vercel.json` and the README's
 * "Security / abuse protection" section).
 *
 * One bucket per key per window. Entries are pruned on the way in, so a burst
 * of distinct keys cannot grow the map without bound.
 */

export type RateLimitRule = {
  /** Requests allowed inside one window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** Requests left in this window (0 once denied). */
  remaining: number;
  /** Milliseconds until the window resets — used for `Retry-After`. */
  resetInMs: number;
  limit: number;
};

type Entry = { count: number; resetAt: number };

export class RateLimiter {
  private readonly buckets = new Map<string, Entry>();

  constructor(private readonly rule: RateLimitRule) {}

  /** Records a hit for `key` and reports whether it was inside the budget. */
  hit(key: string, now: number = Date.now()): RateLimitResult {
    this.prune(now);

    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.rule.windowMs });
      return {
        allowed: true,
        remaining: this.rule.limit - 1,
        resetInMs: this.rule.windowMs,
        limit: this.rule.limit,
      };
    }

    if (existing.count >= this.rule.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetInMs: Math.max(0, existing.resetAt - now),
        limit: this.rule.limit,
      };
    }

    existing.count += 1;

    return {
      allowed: true,
      remaining: this.rule.limit - existing.count,
      resetInMs: Math.max(0, existing.resetAt - now),
      limit: this.rule.limit,
    };
  }

  /** Reads the budget without consuming it. */
  peek(key: string, now: number = Date.now()): RateLimitResult {
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      return {
        allowed: true,
        remaining: this.rule.limit,
        resetInMs: this.rule.windowMs,
        limit: this.rule.limit,
      };
    }

    const remaining = Math.max(0, this.rule.limit - existing.count);

    return {
      allowed: remaining > 0,
      remaining,
      resetInMs: Math.max(0, existing.resetAt - now),
      limit: this.rule.limit,
    };
  }

  /** Drops every expired bucket. Called on the way in, so no timer is needed. */
  prune(now: number = Date.now()): number {
    let removed = 0;

    for (const [key, entry] of this.buckets) {
      if (entry.resetAt <= now) {
        this.buckets.delete(key);
        removed += 1;
      }
    }

    return removed;
  }

  get size(): number {
    return this.buckets.size;
  }

  /** Only for tests: start from an empty store. */
  reset(): void {
    this.buckets.clear();
  }
}

/** Whole seconds, never below 1 — the shape `Retry-After` expects. */
export function retryAfterSeconds(result: RateLimitResult): number {
  return Math.max(1, Math.ceil(result.resetInMs / 1000));
}
