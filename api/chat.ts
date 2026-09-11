import type { VercelRequest, VercelResponse } from "@vercel/node";
import { stepCountIs, streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { flicksTools } from "../lib/flicks-tools.js";
import {
  ALLOWED_ROLES,
  CHAT_LIMITS,
  GENERATION_SETTINGS,
  OPENROUTER_MODEL_ID,
  buildSystemPrompt,
  type ChatMessage,
} from "../lib/flicks-ai.js";

function isAllowedRole(role: unknown): role is ChatMessage["role"] {
  return (
    typeof role === "string" &&
    (ALLOWED_ROLES as readonly string[]).includes(role)
  );
}

/**
 * POST /api/chat
 *
 * Streams an AI SDK UI message stream.
 *
 * The stream can contain:
 * - assistant text
 * - tool input streaming
 * - tool input available
 * - tool output available
 * - tool output errors
 *
 * The API key remains server-side only.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

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

  if (
    !body ||
    typeof body !== "object" ||
    !("messages" in body) ||
    !Array.isArray(
      (body as { messages: unknown }).messages
    )
  ) {
    return res.status(400).json({
      error: "Request must include a messages array.",
    });
  }

  const raw = (body as {
    messages: unknown;
  }).messages as Array<{
    role?: unknown;
    content?: unknown;
  }>;

  if (raw.length === 0) {
    return res.status(400).json({
      error: "messages must not be empty.",
    });
  }

  if (raw.length > CHAT_LIMITS.maxMessagesPerRequest) {
    return res.status(400).json({
      error: "Too many messages in one request.",
    });
  }

  const cleaned: ChatMessage[] = [];

  for (const message of raw) {
    if (!message || typeof message !== "object") {
      return res.status(400).json({
        error: "Invalid message entry.",
      });
    }

    const { role, content } = message as {
      role?: unknown;
      content?: unknown;
    };

    if (!isAllowedRole(role)) {
      return res.status(400).json({
        error: "Invalid role. Allowed: user, assistant.",
      });
    }

    if (typeof content !== "string") {
      return res.status(400).json({
        error: "Message content must be a string.",
      });
    }

    const trimmed = content.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.length > CHAT_LIMITS.maxMessageChars) {
      return res.status(400).json({
        error: "A message is too long.",
      });
    }

    cleaned.push({
      role,
      content: trimmed,
    });
  }

  const history = cleaned.slice(
    -CHAT_LIMITS.maxHistoryMessages
  );

  if (
    history.length === 0 ||
    !history.some((message) => message.role === "user")
  ) {
    return res.status(400).json({
      error: "At least one user message is required.",
    });
  }

  /**
   * Abort the model/tool execution if the client disconnects.
   * This preserves the existing Stop-button behavior.
   */
  const controller = new AbortController();

  const onClose = () => {
    controller.abort();
  };

  req.on("close", onClose);

  try {
    const openrouter = createOpenRouter({
      apiKey,
    });

    const result = streamText({
      model: openrouter(OPENROUTER_MODEL_ID),

      system: buildSystemPrompt(),

      messages: history.map((message) => ({
        role: message.role,
        content: message.content,
      })),

      /**
       * Server-side Flicks tools.
       */
      tools: flicksTools,

      /**
       * Allow the model to call a tool and then continue
       * with a normal assistant response after receiving
       * the tool result.
       */
      stopWhen: stepCountIs(3),

      temperature: GENERATION_SETTINGS.temperature,

      maxOutputTokens:
        GENERATION_SETTINGS.maxOutputTokens,

      abortSignal: controller.signal,
    });

    /**
     * AI SDK UI message stream.
     *
     * Unlike the previous text/plain stream, this stream
     * carries typed tool lifecycle events as well as text.
     */
    result.pipeUIMessageStreamToResponse(res, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    req.off("close", onClose);

    if (controller.signal.aborted) {
      if (!res.writableEnded) {
        res.end();
      }

      return;
    }

    console.error("[chat] error", error);

    if (!res.headersSent) {
      return res.status(500).json({
        error: "AI request failed. Please try again.",
      });
    }

    if (!res.writableEnded) {
      res.end();
    }
  }
}
