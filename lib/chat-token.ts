/**
 * Signed, short-lived, single-use chat tokens.
 *
 * The problem this solves: `POST /api/chat` is an unauthenticated proxy to a
 * paid model, so anyone who reads the front-end source can loop it with `curl`
 * and spend the OpenRouter credit. The fix has to be cheap enough not to need a
 * database and invisible to a real reader.
 *
 * So: `GET /api/chat` hands out an HMAC-signed token that expires in a couple
 * of minutes and can be consumed once. The browser fetches one, sends it as
 * `x-flicks-chat-token`, and the route refuses to spend tokens without it. A
 * script that has not bothered to load the page cannot get a token; a reader
 * who has never notices.
 *
 * The signing key is **derived from `OPENROUTER_API_KEY`** unless
 * `CHAT_TOKEN_SECRET` is set. That means the protection switches itself on
 * exactly where it matters (a deployment with a real key) and stays out of the
 * way in tests and local runs, with no second secret to provision. The key
 * itself is never sent anywhere — only an HMAC of an expiry and a token id.
 *
 * Consumption is tracked in memory, so a token replayed against a *different*
 * serverless instance would be accepted. That is the accepted trade for not
 * needing a store; the rate limiter and the payload caps are the layers behind
 * it.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Header the browser sends the token in. */
export const CHAT_TOKEN_HEADER = "x-flicks-chat-token";

/** How long an issued token stays valid. */
export const CHAT_TOKEN_TTL_MS = 2 * 60 * 1000;

/** Upper bound on how many spent tokens are remembered. */
const MAX_CONSUMED = 5_000;

type ConsumedEntry = { id: string; exp: number };

const consumed: ConsumedEntry[] = [];

/** Derives the signing key: explicit secret first, else the provider key. */
export function resolveTokenSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const explicit = env.CHAT_TOKEN_SECRET?.trim();
  if (explicit) return explicit;

  const providerKey = env.OPENROUTER_API_KEY?.trim();
  if (providerKey) return `flicks-chat-token/v1:${providerKey}`;

  return null;
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export type IssuedToken = {
  token: string;
  /** Milliseconds until it expires — the client refetches before then. */
  expiresInMs: number;
};

/** Creates a token: `exp.jti.signature`, all base64url-safe. */
export function issueChatToken(
  secret: string,
  now: number = Date.now(),
  ttlMs: number = CHAT_TOKEN_TTL_MS,
): IssuedToken {
  const exp = now + ttlMs;
  const jti = randomBytes(9).toString("base64url");
  const payload = `${exp}.${jti}`;

  return { token: `${payload}.${sign(secret, payload)}`, expiresInMs: ttlMs };
}

export type TokenFailure =
  | { ok: true; jti: string; exp: number }
  | { ok: false; reason: "malformed" | "expired" | "signature" | "replayed" };

/** Constant-time verification, then the single-use check. */
export function verifyChatToken(
  token: string | undefined | null,
  secret: string,
  now: number = Date.now(),
): TokenFailure {
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, reason: "malformed" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };

  const [rawExp, jti, signature] = parts as [string, string, string];
  const exp = Number(rawExp);

  if (!Number.isFinite(exp) || !jti || !signature) {
    return { ok: false, reason: "malformed" };
  }

  const expected = Buffer.from(sign(secret, `${rawExp}.${jti}`), "utf8");
  const received = Buffer.from(signature, "utf8");

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false, reason: "signature" };
  }

  if (exp <= now) return { ok: false, reason: "expired" };

  pruneConsumed(now);

  if (consumed.some((entry) => entry.id === jti)) {
    return { ok: false, reason: "replayed" };
  }

  return { ok: true, jti, exp };
}

/** Marks a verified token as used, so it cannot be presented twice. */
export function consumeChatToken(jti: string, exp: number, now: number = Date.now()): void {
  pruneConsumed(now);
  consumed.push({ id: jti, exp });

  if (consumed.length > MAX_CONSUMED) {
    consumed.splice(0, consumed.length - MAX_CONSUMED);
  }
}

function pruneConsumed(now: number): void {
  for (let index = consumed.length - 1; index >= 0; index -= 1) {
    if ((consumed[index] as ConsumedEntry).exp <= now) consumed.splice(index, 1);
  }
}

/** Only for tests: forget every spent token. */
export function resetConsumedTokens(): void {
  consumed.length = 0;
}
