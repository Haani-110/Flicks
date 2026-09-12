import { DefaultChatTransport, type UIMessage } from "ai";
import { CHAT_LIMITS } from "./chat-contract";

/** The one endpoint the chat talks to. Mapped to api/chat.ts on Vercel. */
export const CHAT_API_PATH = "/api/chat";

/** Header the route reads the signed request token from. */
export const CHAT_TOKEN_HEADER = "x-flicks-chat-token";

/** Refresh a little early so a token never expires mid-send. */
const REFRESH_MARGIN_MS = 5_000;

export type ChatRequestBody = {
  /** Chat id assigned by the AI SDK. */
  id: string;
  /** UI messages (with `parts`) — exactly what the route validates. */
  messages: UIMessage[];
  trigger: "submit-message" | "regenerate-message";
  messageId?: string;
};

/**
 * Builds the POST body for /api/chat, trimming history to the window the route
 * accepts. Exported separately so the trimming rule is unit-testable without a
 * network round trip.
 */
export function buildChatRequestBody({
  id,
  messages,
  trigger,
  messageId,
}: ChatRequestBody): ChatRequestBody {
  return {
    id,
    messages: messages.slice(-CHAT_LIMITS.maxHistoryMessages),
    trigger,
    messageId,
  };
}

type CachedToken = { value: string; expiresAt: number };

let cached: CachedToken | null = null;

/**
 * Asks the route for a single-use, short-lived token before each send.
 *
 * The route signs these with a key derived from the server-side provider key,
 * which is what stops a stranger from scripting `POST /api/chat` in a loop and
 * spending the OpenRouter credit. A browser gets one for free; a `curl` that
 * never loaded the page does not.
 *
 * Returning `null` is always safe: the route only enforces the header where a
 * signing key exists, so the dev server, the mocked test suite and any
 * deployment without the variable configured keep working exactly as before.
 */
export async function getChatToken(): Promise<string | null> {
  const now = Date.now();

  if (cached && cached.expiresAt > now) return cached.value;

  try {
    const response = await fetch(CHAT_API_PATH, { method: "GET" });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      token?: unknown;
      expiresInMs?: unknown;
    };

    if (typeof payload.token !== "string" || payload.token.length === 0) {
      return null;
    }

    const ttl =
      typeof payload.expiresInMs === "number" && payload.expiresInMs > 0
        ? payload.expiresInMs
        : 60_000;

    cached = { value: payload.token, expiresAt: now + ttl - REFRESH_MARGIN_MS };

    return cached.value;
  } catch {
    // No token endpoint (dev server, mocked route, offline): send without one.
    return null;
  }
}

/** Test hook: forget a cached token so the next send asks for a new one. */
export function resetChatTokenCache(): void {
  cached = null;
}

/**
 * Transport for the Flicks assistant.
 *
 * `/api/chat` speaks the AI SDK UI message stream protocol, so tool calls and
 * their results arrive as message parts the UI can render.
 */
export function createChatTransport() {
  return new DefaultChatTransport<UIMessage>({
    api: CHAT_API_PATH,
    // Resolved per request, so a token is fetched (or reused from cache) at the
    // moment the message is actually sent.
    headers: async (): Promise<Record<string, string>> => {
      const token = await getChatToken();
      return token ? { [CHAT_TOKEN_HEADER]: token } : {};
    },
    prepareSendMessagesRequest: ({ id, messages, trigger, messageId }) => ({
      body: buildChatRequestBody({ id, messages, trigger, messageId }),
    }),
  });
}
