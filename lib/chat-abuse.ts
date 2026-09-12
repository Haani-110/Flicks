/**
 * Abuse protection for the assistant route, beyond the conversation limits in
 * `src/lib/chat-contract.ts` (which are shared with the client).
 *
 * Two things live here:
 *
 * 1. **A byte cap.** The per-message character limit stops one long message,
 *    but not a request assembled from many parts. This bounds the whole body
 *    before it is handed to a model that bills by the token.
 *
 * 2. **A part allow-list.** The route accepts `assistant` messages in the
 *    history so a conversation can continue, and a client can invent those
 *    freely. Without this, a caller could smuggle in fabricated tool calls,
 *    tool results, source citations or data parts and have the model treat
 *    them as things Flicks itself had already said and looked up — a prompt
 *    injection that arrives through the front door. Only the parts the
 *    assistant can legitimately have produced are echoed back.
 *
 * Both are additive: nothing the real client sends is rejected.
 */

import type { UIMessage } from "ai";

/** Hard ceiling on one request body, in bytes of JSON. */
export const MAX_REQUEST_BYTES = 64 * 1024;

/**
 * Parts the browser may send back for a role it claims.
 *
 * `user`: what the composer produces, plus an attachment.
 * `assistant`: what this route streams back — text, its reasoning, and the
 * step marker. Tool calls and their results are *server-authored*: a client
 * that supplies them is inventing history.
 */
const ALLOWED_PARTS: Record<"user" | "assistant", ReadonlySet<string>> = {
  user: new Set(["text", "file", "reasoning"]),
  assistant: new Set(["text", "reasoning", "step-start"]),
};

export type AbuseCheck =
  | { ok: true }
  | { ok: false; status: 400 | 413; error: string };

/** Bounds the serialized request. Cheap enough to run on every call. */
export function checkPayloadSize(body: unknown): AbuseCheck {
  let serialized: string;

  try {
    serialized = JSON.stringify(body) ?? "";
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body." };
  }

  const bytes = Buffer.byteLength(serialized, "utf8");

  if (bytes > MAX_REQUEST_BYTES) {
    return {
      ok: false,
      status: 413,
      error: "Request is too large.",
    };
  }

  return { ok: true };
}

/**
 * Rejects history the client could not legitimately have received.
 *
 * Runs *after* the existing shape checks in the route, so every error message
 * already covered by `api/chat.test.ts` keeps its exact wording.
 */
export function checkMessageParts(messages: UIMessage[]): AbuseCheck {
  for (const message of messages) {
    const role = message.role as "user" | "assistant";
    const allowed = ALLOWED_PARTS[role];

    if (!allowed) continue;

    for (const part of message.parts ?? []) {
      const type = (part as { type?: unknown })?.type;

      if (typeof type !== "string") {
        return { ok: false, status: 400, error: "Invalid message part." };
      }

      if (!allowed.has(type)) {
        return {
          ok: false,
          status: 400,
          error: `Message parts of type "${type}" are not accepted from the client.`,
        };
      }
    }
  }

  return { ok: true };
}

type HeadersLike = Record<string, string | string[] | undefined> | undefined;

/**
 * Best-effort client identifier.
 *
 * Behind Vercel the real address is in `x-forwarded-for`; locally it is on the
 * socket. Falls back to `"unknown"`, which means an unidentifiable caller
 * shares one bucket rather than escaping the limiter.
 */
export function clientKey(req: {
  headers?: HeadersLike;
  socket?: { remoteAddress?: string } | null;
}): string {
  const forwarded = req.headers?.["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;

  if (typeof first === "string" && first.trim()) {
    return first.split(",")[0]!.trim();
  }

  const real = req.headers?.["x-real-ip"];
  const realIp = Array.isArray(real) ? real[0] : real;

  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();

  return req.socket?.remoteAddress?.trim() || "unknown";
}
