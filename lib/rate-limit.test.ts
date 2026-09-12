import { describe, expect, it } from "vitest";
import { RateLimiter, retryAfterSeconds } from "./rate-limit.js";

describe("RateLimiter", () => {
  it("allows requests up to the limit and denies the next one", () => {
    const limiter = new RateLimiter({ limit: 3, windowMs: 1_000 });

    expect(limiter.hit("a", 0)).toMatchObject({ allowed: true, remaining: 2 });
    expect(limiter.hit("a", 100)).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.hit("a", 200)).toMatchObject({ allowed: true, remaining: 0 });

    const denied = limiter.hit("a", 300);
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.resetInMs).toBe(700);
  });

  it("keeps a separate budget per key", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1_000 });

    expect(limiter.hit("a", 0).allowed).toBe(true);
    expect(limiter.hit("a", 1).allowed).toBe(false);
    expect(limiter.hit("b", 2).allowed).toBe(true);
  });

  it("starts a fresh window once the old one has elapsed", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1_000 });

    expect(limiter.hit("a", 0).allowed).toBe(true);
    expect(limiter.hit("a", 999).allowed).toBe(false);
    expect(limiter.hit("a", 1_000)).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("reports the budget without spending it", () => {
    const limiter = new RateLimiter({ limit: 2, windowMs: 1_000 });

    expect(limiter.peek("a", 0)).toMatchObject({ allowed: true, remaining: 2 });

    limiter.hit("a", 0);

    expect(limiter.peek("a", 1)).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.peek("a", 1).remaining).toBe(1);
  });

  it("prunes expired buckets so a burst of keys cannot grow the map forever", () => {
    const limiter = new RateLimiter({ limit: 5, windowMs: 1_000 });

    for (let index = 0; index < 100; index += 1) {
      limiter.hit(`key-${index}`, 0);
    }

    expect(limiter.size).toBe(100);
    expect(limiter.prune(1_000)).toBe(100);
    expect(limiter.size).toBe(0);
  });

  it("clears completely on reset", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1_000 });

    limiter.hit("a", 0);
    expect(limiter.hit("a", 1).allowed).toBe(false);

    limiter.reset();

    expect(limiter.hit("a", 2).allowed).toBe(true);
  });
});

describe("retryAfterSeconds", () => {
  it("rounds up to whole seconds and never says zero", () => {
    expect(
      retryAfterSeconds({ allowed: false, remaining: 0, resetInMs: 1_500, limit: 1 }),
    ).toBe(2);
    expect(
      retryAfterSeconds({ allowed: false, remaining: 0, resetInMs: 0, limit: 1 }),
    ).toBe(1);
  });
});
