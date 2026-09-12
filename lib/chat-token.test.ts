import { afterEach, describe, expect, it } from "vitest";
import {
  CHAT_TOKEN_TTL_MS,
  consumeChatToken,
  issueChatToken,
  resetConsumedTokens,
  resolveTokenSecret,
  verifyChatToken,
} from "./chat-token.js";

const SECRET = "unit-test-secret";
const NOW = 1_700_000_000_000;

afterEach(() => {
  resetConsumedTokens();
  delete process.env.CHAT_TOKEN_SECRET;
  delete process.env.OPENROUTER_API_KEY;
});

describe("resolveTokenSecret", () => {
  it("prefers an explicit secret", () => {
    process.env.CHAT_TOKEN_SECRET = "explicit";
    process.env.OPENROUTER_API_KEY = "provider-key";

    expect(resolveTokenSecret()).toBe("explicit");
  });

  it("derives from the provider key, so protection is on wherever AI is configured", () => {
    process.env.OPENROUTER_API_KEY = "provider-key";

    const secret = resolveTokenSecret();

    expect(secret).toContain("provider-key");
    expect(secret).not.toBe("provider-key");
  });

  it("stays out of the way when nothing is configured", () => {
    expect(resolveTokenSecret()).toBeNull();
  });

  it("ignores whitespace-only values", () => {
    process.env.CHAT_TOKEN_SECRET = "   ";
    process.env.OPENROUTER_API_KEY = "  ";

    expect(resolveTokenSecret()).toBeNull();
  });
});

describe("issueChatToken / verifyChatToken", () => {
  it("round-trips a freshly issued token", () => {
    const { token, expiresInMs } = issueChatToken(SECRET, NOW);

    expect(expiresInMs).toBe(CHAT_TOKEN_TTL_MS);
    expect(verifyChatToken(token, SECRET, NOW)).toMatchObject({ ok: true });
  });

  it("is URL-safe: no character a header value cannot carry", () => {
    const { token } = issueChatToken(SECRET, NOW);

    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("rejects a token signed with a different secret", () => {
    const { token } = issueChatToken(SECRET, NOW);

    expect(verifyChatToken(token, "another-secret", NOW)).toEqual({
      ok: false,
      reason: "signature",
    });
  });

  it("rejects a tampered expiry", () => {
    const { token } = issueChatToken(SECRET, NOW);
    const [, jti, signature] = token.split(".") as [string, string, string];
    const forged = `${NOW + 60 * 60 * 1000}.${jti}.${signature}`;

    expect(verifyChatToken(forged, SECRET, NOW)).toEqual({
      ok: false,
      reason: "signature",
    });
  });

  it("rejects an expired token", () => {
    const { token } = issueChatToken(SECRET, NOW, 1_000);

    expect(verifyChatToken(token, SECRET, NOW + 1_001)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it.each([
    ["nothing at all", undefined],
    ["an empty string", ""],
    ["one segment", "abc"],
    ["two segments", "1.2"],
    ["four segments", "1.2.3.4"],
    ["a non-numeric expiry", "not-a-number.jti.sig"],
  ])("rejects %s", (_label, token) => {
    expect(verifyChatToken(token as string, SECRET, NOW)).toEqual({
      ok: false,
      reason: "malformed",
    });
  });

  it("marks a consumed token as replayed", () => {
    const { token } = issueChatToken(SECRET, NOW);
    const verified = verifyChatToken(token, SECRET, NOW);

    expect(verified.ok).toBe(true);
    if (!verified.ok) return;

    consumeChatToken(verified.jti, verified.exp, NOW);

    expect(verifyChatToken(token, SECRET, NOW)).toEqual({
      ok: false,
      reason: "replayed",
    });
  });

  it("stops remembering spent tokens once they have expired anyway", () => {
    const { token } = issueChatToken(SECRET, NOW, 1_000);
    const verified = verifyChatToken(token, SECRET, NOW);

    expect(verified.ok).toBe(true);
    if (!verified.ok) return;

    consumeChatToken(verified.jti, verified.exp, NOW);

    // Past expiry the replay record is pruned and the token simply reads as
    // expired — the outcome for a caller is the same refusal.
    expect(verifyChatToken(token, SECRET, NOW + 2_000)).toEqual({
      ok: false,
      reason: "expired",
    });
  });
});
