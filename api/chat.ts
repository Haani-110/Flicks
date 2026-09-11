import type { VercelRequest, VercelResponse } from "@vercel/node";
import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  ALLOWED_ROLES,
  CHAT_LIMITS,
  GENERATION_SETTINGS,
  OPENROUTER_MODEL_ID,
  buildSystemPrompt,
  type ChatMessage,
} from "../lib/flicks-ai";

function isAllowedRole(role: unknown): role is ChatMessage["role"] {
  return (
    typeof role === "string" &&
    (ALLOWED_ROLES as readonly string[]).includes(role)
  );
}

/**
 * POST /api/chat — streams a plain-text assistant reply.
 *
 * Request body: { messages: [{ role: "user" | "assistant", content: string }] }
 * Response: text/plain streamed progressively (chunked).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "AI is not configured." });
  }

  let body: unknown;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("messages" in body) ||
    !Array.isArray((body as { messages: unknown }).messages)
  ) {
    return res.status(400).json({ error: "Request must include a messages array." });
  }

  const raw = (body as { messages: unknown }).messages as Array<{
    role?: unknown;
    content?: unknown;
  }>;

  if (raw.length === 0) {
    return res.status(400).json({ error: "messages must not be empty." });
  }
  if (raw.length > CHAT_LIMITS.maxMessagesPerRequest) {
    return res
      .status(400)
      .json({ error: "Too many messages in one request." });
  }

  const cleaned: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") {
      return res.status(400).json({ error: "Invalid message entry." });
    }
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (!isAllowedRole(role)) {
      return res
        .status(400)
        .json({ error: "Invalid role. Allowed: user, assistant." });
    }
    if (typeof content !== "string") {
      return res.status(400).json({ error: "Message content must be a string." });
    }
    const trimmed = content.trim();
    if (!trimmed) continue;
    if (trimmed.length > CHAT_LIMITS.maxMessageChars) {
      return res.status(400).json({ error: "A message is too long." });
    }
    cleaned.push({ role, content: trimmed });
  }

  const history = cleaned.slice(-CHAT_LIMITS.maxHistoryMessages);
  if (history.length === 0 || !history.some((m) => m.role === "user")) {
    return res
      .status(400)
      .json({ error: "At least one user message is required." });
  }

  // Abort the model call if the client disconnects (Stop button / navigation).
  const controller = new AbortController();
  const onClose = () => controller.abort();
  req.on("close", onClose);

  try {
    const openrouter = createOpenRouter({ apiKey });
    const result = streamText({
      model: openrouter(OPENROUTER_MODEL_ID),
      system: buildSystemPrompt(),
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      temperature: GENERATION_SETTINGS.temperature,
      maxOutputTokens: GENERATION_SETTINGS.maxOutputTokens,
      abortSignal: controller.signal,
    });

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    });

    try {
      for await (const delta of result.textStream) {
        if (controller.signal.aborted) break;
        if (!res.writable) break;
        res.write(delta);
      }
    } catch (streamError) {
      if (!controller.signal.aborted) {
        console.error("[chat] stream error", streamError);
      }
    } finally {
      req.off("close", onClose);
      if (!res.writableEnded) res.end();
    }
  } catch (error) {
    req.off("close", onClose);
    if (controller.signal.aborted) {
      if (!res.writableEnded) res.end();
      return;
    }
    console.error("[chat] error", error);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ error: "AI request failed. Please try again." });
    }
    if (!res.writableEnded) res.end();
  }
}
