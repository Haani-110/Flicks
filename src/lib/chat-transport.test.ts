import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";
import { CHAT_LIMITS } from "./chat-contract";
import {
  buildChatRequestBody,
  CHAT_API_PATH,
  createChatTransport,
  getChatToken,
  resetChatTokenCache,
} from "./chat-transport";

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

describe("getChatToken", () => {
  /** Replaces the global fetch for one case and restores it afterwards. */
  function stubFetch(implementation: (input: unknown, init?: RequestInit) => unknown) {
    const spy = vi.fn(implementation);
    vi.stubGlobal("fetch", spy);
    return spy;
  }

  beforeEach(() => {
    resetChatTokenCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetChatTokenCache();
  });

  it("collects the token the route signs before a send", async () => {
    const spy = stubFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ token: "signed.token", expiresInMs: 120_000 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    expect(await getChatToken()).toBe("signed.token");
    expect(spy).toHaveBeenCalledWith(CHAT_API_PATH, { method: "GET" });
  });

  it("reuses a still-valid token instead of asking again for every message", async () => {
    const spy = stubFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ token: "signed.token", expiresInMs: 120_000 }), {
          status: 200,
        }),
      ),
    );

    expect(await getChatToken()).toBe("signed.token");
    expect(await getChatToken()).toBe("signed.token");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("asks again once the cached token is near expiry", async () => {
    vi.useFakeTimers();

    try {
      const spy = stubFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify({ token: `token-${spy.mock.calls.length}`, expiresInMs: 10_000 }), {
            status: 200,
          }),
        ),
      );

      expect(await getChatToken()).toBe("token-1");

      // Past the 10 s lifetime minus the refresh margin.
      vi.advanceTimersByTime(9_000);

      expect(await getChatToken()).toBe("token-2");
      expect(spy).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("sends nothing rather than blocking the chat when the route has no token endpoint", async () => {
    stubFetch(() => Promise.resolve(new Response("not json", { status: 404 })));

    await expect(getChatToken()).resolves.toBeNull();
  });

  it("degrades to a tokenless send when the request throws", async () => {
    stubFetch(() => Promise.reject(new Error("offline")));

    await expect(getChatToken()).resolves.toBeNull();
  });

  it("ignores a payload that is not a usable token", async () => {
    stubFetch(() =>
      Promise.resolve(new Response(JSON.stringify({ expiresInMs: 1000 }), { status: 200 })),
    );

    await expect(getChatToken()).resolves.toBeNull();
  });
});

describe("createChatTransport", () => {
  it("attaches the token header the route asks for", async () => {
    resetChatTokenCache();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ token: "header.token", expiresInMs: 60_000 }), {
            status: 200,
          }),
        ),
      ),
    );

    const transport = createChatTransport();
    const headers = (await (
      transport as unknown as {
        prepareSendMessagesRequest: unknown;
        headers?: () => Promise<Record<string, string>>;
      }
    ).headers?.()) ?? {};

    expect(headers).toEqual({ "x-flicks-chat-token": "header.token" });

    vi.unstubAllGlobals();
    resetChatTokenCache();
  });
});
