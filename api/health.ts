/**
 * GET /api/health — a first-party probe for uptime monitors and for the
 * app's own diagnostics page.
 *
 * It answers three questions a monitor can act on, without leaking anything
 * secret: is the function cold-starting and responding at all, which build is
 * serving (the commit sha Vercel injects at build time), and is the chat
 * provider configured. "Configured" is a boolean — the key itself never leaves
 * the server.
 *
 * Deliberately not rate limited and not token-gated: it must be callable by
 * anything, including a curl loop in a CI job. It spends no model credit and
 * returns no user data, so there is nothing to abuse.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

type HealthPayload = {
  status: "ok";
  service: string;
  /** Epoch ms of the probe, so a monitor can chart latency gaps. */
  now: number;
  build: {
    /** VERCEL_GIT_COMMIT_SHA at build time, or "local" outside Vercel. */
    commit: string;
    environment: string;
  };
  chat: {
    /** Whether OPENROUTER_API_KEY is present. Never the key itself. */
    configured: boolean;
  };
};

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).json({ error: "Method not allowed. Use GET." });
    return;
  }

  // Health is per-request truth; a cached "ok" after a bad deploy is a lie.
  res.setHeader("Cache-Control", "no-store");

  const payload: HealthPayload = {
    status: "ok",
    service: "flicks",
    now: Date.now(),
    build: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "local",
      environment: process.env.VERCEL_ENV || "development",
    },
    chat: {
      configured: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    },
  };

  res.status(200).json(payload);
}
