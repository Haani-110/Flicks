import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { CHAT_LIMITS } from "./chat-contract";
import { buildChatRequestBody, CHAT_API_PATH } from "./chat-transport";

function message(index: number, role: UIMessage["role"] = "user"): UIMessage {
  return {
    id: `message-${index}`,
    role,
    parts: [{ type: "text", text: `message ${index}` }],
  };
}

describe("chat transport", () => {
  it("posts to the assistant route", () => {
    expect(CHAT_API_PATH).toBe("/api/chat");
  });

  it("trims history to the window the route accepts but keeps the newest turn", () => {
    const messages = Array.from({ length: CHAT_LIMITS.maxHistoryMessages + 7 }, (_, index) =>
      message(index),
    );

    const body = buildChatRequestBody({
      id: "chat-1",
      messages,
      trigger: "submit-message",
      messageId: undefined,
    });

    expect(body.messages).toHaveLength(CHAT_LIMITS.maxHistoryMessages);
    expect(body.messages.at(-1)).toBe(messages.at(-1));
    expect(body.messages[0]).toBe(messages[7]);
  });

  it("passes messages through untouched when history is still short", () => {
    const messages = [message(0), message(1, "assistant")];

    const body = buildChatRequestBody({
      id: "chat-1",
      messages,
      trigger: "regenerate-message",
      messageId: "message-1",
    });

    expect(body.messages).toEqual(messages);
    expect(body.trigger).toBe("regenerate-message");
    expect(body.messageId).toBe("message-1");
  });

  it("does not mutate the caller's history", () => {
    const messages = Array.from({ length: CHAT_LIMITS.maxHistoryMessages + 3 }, (_, index) =>
      message(index),
    );
    const snapshot = [...messages];

    buildChatRequestBody({
      id: "chat-1",
      messages,
      trigger: "submit-message",
      messageId: undefined,
    });

    expect(messages).toEqual(snapshot);
  });
});
