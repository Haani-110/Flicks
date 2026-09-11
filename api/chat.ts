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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {

throw new Error("Test failure");

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

  // Validate UI messages sent by useChat
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

  const controller = new AbortController();

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

    result.pipeUIMessageStreamToResponse(res, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
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
    req.off("close", onClose);
  }
}
