import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import type { LanguageModelV3StreamPart } from "@ai-sdk/provider";

/**
 * Tests for the assistant route.
 *
 * The provider is mocked (never OpenRouter, never the network) while the route
 * itself — validation, the stream protocol and the tool wiring — runs for
 * real, so the client-facing contract is covered.
 */

const { provider } = vi.hoisted(() => ({
  provider: { model: undefined as unknown },
}));

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: () => () => provider.model,
}));

import handler from "./chat";

const USAGE = {
  inputTokens: { total: 12, noCache: 12, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 8, noCache: 8, cacheRead: 0, cacheWrite: 0 },
};

function textStream(text: string): LanguageModelV3StreamPart[] {
  return [
    { type: "text-start", id: "text-1" },
    { type: "text-delta", id: "text-1", delta: text },
    { type: "text-end", id: "text-1" },
    { type: "finish", finishReason: { unified: "stop" }, usage: USAGE },
  ] as unknown as LanguageModelV3StreamPart[];
}

function mockModel(streams: LanguageModelV3StreamPart[][]) {
  provider.model = new MockLanguageModelV3({
    doStream: streams.map((chunks) => ({
      stream: simulateReadableStream({ chunks, chunkDelayInMs: null }),
    })),
  });
}

function createRequest(body: unknown, method = "POST") {
  const req = new EventEmitter() as EventEmitter & {
    method: string;
    body: unknown;
  };
  req.method = method;
  req.body = body;
  return req;
}

/** Minimal stand-in for a Vercel/Node response that records what was written. */
function createResponse() {
  const state = {
    status: 200,
    headers: {} as Record<string, string>,
    body: "",
    payload: undefined as unknown,
    ended: false,
  };

  const res = {
    get headersSent() {
      return Object.keys(state.headers).length > 0;
    },
    get writableEnded() {
      return state.ended;
    },
    setHeader(name: string, value: string) {
      state.headers[name.toLowerCase()] = value;
      return res;
    },
    writeHead(status: number, headers?: Record<string, string>) {
      state.status = status;
      Object.assign(state.headers, headers);
      return res;
    },
    write(chunk: string | Uint8Array) {
      state.body += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
      return true;
    },
    end() {
      state.ended = true;
      return res;
    },
    once: () => res,
    status(code: number) {
      state.status = code;
      return res;
    },
    json(body: unknown) {
      state.payload = body;
      state.ended = true;
      return res;
    },
  };

  return { res, state };
}

async function callRoute(body: unknown, method = "POST") {
  const req = createRequest(body, method);
  const { res, state } = createResponse();

  await handler(
    req as never,
    res as never,
  );

  return state;
}

const USER_MESSAGE = {
  id: "user-1",
  role: "user",
  parts: [{ type: "text", text: "How long is Dune: Part Two?" }],
};

describe("POST /api/chat", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    provider.model = undefined;
  });

  it("rejects any method other than POST", async () => {
    const state = await callRoute({ messages: [USER_MESSAGE] }, "GET");

    expect(state.status).toBe(405);
    expect(state.payload).toEqual({ error: "Method not allowed. Use POST." });
  });

  it("refuses to run without a configured API key", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const state = await callRoute({ messages: [USER_MESSAGE] });

    expect(state.status).toBe(500);
    expect(state.payload).toEqual({ error: "AI is not configured." });
  });

  it("validates the shape of the incoming messages", async () => {
    const cases: [unknown, string][] = [
      [{ messages: [] }, "messages must not be empty."],
      [{}, "Request must include a messages array."],
      [{ messages: [{ id: "1", role: "system", parts: [] }] }, "Invalid message role."],
      [{ messages: [{ id: "1", role: "user" }] }, "Message parts are missing."],
      [
        { messages: [{ id: "1", role: "assistant", parts: [{ type: "text" }] }] },
        "At least one user message is required.",
      ],
      [
        {
          messages: [
            {
              id: "1",
              role: "user",
              parts: [{ type: "text", text: "x".repeat(2001) }],
            },
          ],
        },
        "A message is too long.",
      ],
    ];

    for (const [body, error] of cases) {
      const state = await callRoute(body);

      expect(state.status).toBe(400);
      expect(state.payload).toEqual({ error });
    }
  });

  it("streams the UI message protocol the chat client renders", async () => {
    mockModel([[{ type: "stream-start", warnings: [] }, ...textStream("166 minutes.")]]);

    const state = await callRoute({ messages: [USER_MESSAGE] });

    expect(state.headers["content-type"]).toContain("text/event-stream");
    expect(state.headers["x-vercel-ai-ui-message-stream"]).toBe("v1");
    expect(state.body).toContain('"type":"text-delta"');
    expect(state.body).toContain("166 minutes.");
    expect(state.body).toContain('"finish"');
    expect(state.ended).toBe(true);
  });

  it("runs the catalog tool and streams its result to the client", async () => {
    mockModel([
      [
        { type: "stream-start", warnings: [] },
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "search_movies",
          input: JSON.stringify({ genre: "Sci-Fi", maxRuntime: 170 }),
        },
        { type: "finish", finishReason: { unified: "tool-calls" }, usage: USAGE },
      ],
      [
        { type: "stream-start", warnings: [] },
        ...textStream("Three sci-fi titles fit."),
      ],
    ] as unknown as LanguageModelV3StreamPart[][]);

    const state = await callRoute({ messages: [USER_MESSAGE] });

    expect(state.body).toContain('"type":"tool-input-available"');
    expect(state.body).toContain('"type":"tool-output-available"');
    expect(state.body).toContain("Everything Everywhere All at Once");
    expect(state.body).toContain("Three sci-fi titles fit.");
  });

  it("reports a provider failure inside the stream, without leaking the cause", async () => {
    provider.model = new MockLanguageModelV3({
      doStream: () => {
        throw new Error("provider exploded: sk-secret");
      },
    });

    const state = await callRoute({ messages: [USER_MESSAGE] });

    expect(state.body).toContain('"type":"error"');
    expect(state.body).toContain("AI request failed. Please try again.");
    expect(state.body).not.toContain("sk-secret");
    expect(state.ended).toBe(true);
  });
});
