import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { flicksTools } from "../lib/flicks-tools.js";
import {
  CHAT_LIMITS,
  GENERATION_SETTINGS,
  OPENROUTER_MODEL_ID,
  buildSystemPrompt,
} from "../lib/flicks-ai.js";
import { RateLimiter, retryAfterSeconds } from "../lib/rate-limit.js";
import {
  CHAT_TOKEN_HEADER,
  consumeChatToken,
  issueChatToken,
  resolveTokenSecret,
  verifyChatToken,
} from "../lib/chat-token.js";
import {
  checkMessageParts,
  checkPayloadSize,
  clientKey,
} from "../lib/chat-abuse.js";

/**
 * Vercel kills the function at this many seconds. Exported so the platform
 * picks it up, and used below (minus a margin) as the route's own deadline so
 * the stream closes cleanly instead of being cut off mid-token.
 */
export const maxDuration = 60;

/** How long a generation may run before the route aborts it itself. */
const STREAM_TIMEOUT_MS = (maxDuration - 5) * 1000;

/**
 * Spending a model token is the expensive action, so it gets the tight budget.
 * Issuing a token is nearly free, so it gets a looser one — it only has to stop
 * someone hammering the issue endpoint itself.
 */
const chatLimiter = new RateLimiter({ limit: 12, windowMs: 60_000 });
const tokenLimiter = new RateLimiter({ limit: 40, windowMs: 60_000 });

/** Test hook: the in-memory buckets are per-instance, tests need a clean one. */
export function resetChatGuards(): void {
  chatLimiter.reset();
  tokenLimiter.reset();
}

export function chatLimiterState(key: string) {
  return chatLimiter.peek(key);
}

const NO_SNIFF = { "X-Content-Type-Options": "nosniff" } as const;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Method handling comes first, exactly as it always has: a GET carrying a
  // body is someone probing the route, not the browser asking for a token.
  if (req.method !== "POST") {
    // A bare GET is the token-issuing endpoint the browser calls before it
    // sends a message.
    if (req.method === "GET" && req.body === undefined) {
      return issueToken(req, res, process.env.OPENROUTER_API_KEY);
    }

    res.setHeader("Allow", "POST, GET");
    return res.status(405).json({
      error: "Method not allowed. Use POST.",
    });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "AI is not configured.",
    });
  }

  const key = clientKey(req);

  // --- abuse protection: budget per caller, then a signed token -------------
  const budget = chatLimiter.hit(key);

  res.setHeader("X-RateLimit-Limit", String(budget.limit));
  res.setHeader("X-RateLimit-Remaining", String(budget.remaining));

  if (!budget.allowed) {
    res.setHeader("Retry-After", String(retryAfterSeconds(budget)));
    return res.status(429).json({
      error: "Too many requests. Please wait a minute before asking again.",
    });
  }

  // Only enforced once a signing key exists, i.e. wherever a real provider key
  // is configured. That keeps `npm test` and a keyless local run working while
  // making the deployed route require a page load before it will spend tokens.
  const secret = resolveTokenSecret();

  if (secret) {
    const presented = readHeader(req, CHAT_TOKEN_HEADER);
    const verified = verifyChatToken(presented, secret);

    if (!verified.ok) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(401).json({
        ...NO_SNIFF,
        error:
          verified.reason === "replayed"
            ? "That request token was already used. Reload the page and try again."
            : "Your session needs refreshing. Reload the page and try again.",
      });
    }

    consumeChatToken(verified.jti, verified.exp);
  }

  let body: unknown;

  try {
    body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;
  } catch {
    return res.status(400).json({
      error: "Invalid JSON body.",
    });
  }

  // --- abuse protection: bound the whole body, not just one message ---------
  const size = checkPayloadSize(body);

  if (!size.ok) {
    return res.status(size.status).json({ error: size.error });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("messages" in body) ||
    !Array.isArray((body as { messages?: unknown }).messages)
  ) {
    return res.status(400).json({
      error: "Request must include a messages array.",
    });
  }

  const messages = (body as { messages: UIMessage[] }).messages;

  if (messages.length === 0) {
    return res.status(400).json({
      error: "messages must not be empty.",
    });
  }

  if (messages.length > CHAT_LIMITS.maxMessagesPerRequest) {
    return res.status(400).json({
      error: "Too many messages in one request.",
    });
  }

  // Validate UI messages sent by the frontend
  for (const message of messages) {
    if (!message || typeof message !== "object") {
      return res.status(400).json({
        error: "Invalid message entry.",
      });
    }

    if (
      message.role !== "user" &&
      message.role !== "assistant"
    ) {
      return res.status(400).json({
        error: "Invalid message role.",
      });
    }

    if (!Array.isArray(message.parts)) {
      return res.status(400).json({
        error: "Message parts are missing.",
      });
    }

    for (const part of message.parts) {
      if (
        part.type === "text" &&
        typeof part.text === "string" &&
        part.text.length > CHAT_LIMITS.maxMessageChars
      ) {
        return res.status(400).json({
          error: "A message is too long.",
        });
      }
    }
  }

  const history = messages.slice(
    -CHAT_LIMITS.maxHistoryMessages,
  );

  if (!history.some((message) => message.role === "user")) {
    return res.status(400).json({
      error: "At least one user message is required.",
    });
  }

  // --- abuse protection: no invented tool calls in the supplied history -----
  const parts = checkMessageParts(history);

  if (!parts.ok) {
    return res.status(parts.status).json({ error: parts.error });
  }

  const controller = new AbortController();

  // A generation that outlives the platform's own limit would be cut off
  // mid-sentence, so the route ends it first and the client sees a clean stop.
  const deadline = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  const onClose = () => {
    controller.abort();
  };

  req.on("close", onClose);

  try {
    const openrouter = createOpenRouter({
      apiKey,
    });

    const modelMessages = await convertToModelMessages(history);

    const result = streamText({
      model: openrouter(OPENROUTER_MODEL_ID),

      system: buildSystemPrompt(),

      messages: modelMessages,

      tools: flicksTools,

      stopWhen: stepCountIs(3),

      temperature: GENERATION_SETTINGS.temperature,

      maxOutputTokens:
        GENERATION_SETTINGS.maxOutputTokens,

      abortSignal: controller.signal,
    });

    // Stream the AI SDK UI message protocol: the client renders text, tool
    // calls and tool results as message parts. The response headers
    // (text/event-stream + x-vercel-ai-ui-message-stream) come from the SDK.
    await result.pipeUIMessageStreamToResponse(res, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
        "X-RateLimit-Limit": String(budget.limit),
        "X-RateLimit-Remaining": String(budget.remaining),
      },

      // Never leak provider errors to the browser; the client shows this text.
      onError: (error) => {
        console.error("[chat] stream error", error);
        return "AI request failed. Please try again.";
      },
    });
  } catch (error) {
    console.error("[chat] error", error);

    if (controller.signal.aborted) {
      if (!res.writableEnded) {
        res.end();
      }
      return;
    }

    if (!res.headersSent) {
      return res.status(500).json({
        error: "AI request failed. Please try again.",
      });
    }

    if (!res.writableEnded) {
      res.end();
    }
  } finally {
    clearTimeout(deadline);
    req.off("close", onClose);
  }
}

/**
 * `GET /api/chat` — hand the browser a single-use token.
 *
 * No key configured means no AI either, so this says so rather than issuing a
 * token nothing would accept.
 */
function issueToken(
  req: VercelRequest,
  res: VercelResponse,
  apiKey: string | undefined,
) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (!apiKey) {
    return res.status(500).json({ error: "AI is not configured." });
  }

  const secret = resolveTokenSecret();

  if (!secret) {
    return res.status(500).json({ error: "AI is not configured." });
  }

  const key = clientKey(req);
  const budget = tokenLimiter.hit(key);

  res.setHeader("X-RateLimit-Limit", String(budget.limit));
  res.setHeader("X-RateLimit-Remaining", String(budget.remaining));

  if (!budget.allowed) {
    res.setHeader("Retry-After", String(retryAfterSeconds(budget)));
    return res.status(429).json({
      error: "Too many requests. Please wait a minute before asking again.",
    });
  }

  const issued = issueChatToken(secret);

  return res.status(200).json({
    token: issued.token,
    expiresInMs: issued.expiresInMs,
  });
}

function readHeader(req: VercelRequest, name: string): string | undefined {
  const value = req.headers?.[name];

  if (Array.isArray(value)) return value[0];

  return typeof value === "string" ? value : undefined;
}
