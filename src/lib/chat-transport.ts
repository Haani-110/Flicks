import { DefaultChatTransport, type UIMessage } from "ai";
import { CHAT_LIMITS } from "./chat-contract";

/** The one endpoint the chat talks to. Mapped to api/chat.ts on Vercel. */
export const CHAT_API_PATH = "/api/chat";

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

/**
 * Transport for the Flicks assistant.
 *
 * `/api/chat` speaks the AI SDK UI message stream protocol, so tool calls and
 * their results arrive as message parts the UI can render.
 */
export function createChatTransport() {
  return new DefaultChatTransport<UIMessage>({
    api: CHAT_API_PATH,
    prepareSendMessagesRequest: ({ id, messages, trigger, messageId }) => ({
      body: buildChatRequestBody({ id, messages, trigger, messageId }),
    }),
  });
}
