import { vi } from "vitest";

/**
 * Mocks the AI route.
 *
 * `/api/chat` is a Vercel function that talks to OpenRouter; tests replace it
 * with a scripted response so no test ever reaches a provider. The global
 * fetch stub installed in src/test/setup.ts throws for anything unmocked, so a
 * test that forgets this helper fails instead of calling the network.
 */

export type RecordedChatRequest = {
  url: string;
  body: Record<string, unknown> | undefined;
};

export type ChatRouteReply =
  | Response
  | Promise<Response>
  | (() => Response | Promise<Response>);

export type ChatRouteMock = {
  /** The fetch stub, exposed for assertions (call counts, arguments). */
  fetchMock: ReturnType<typeof vi.fn>;
  /** Every request the app made, in order. */
  requests: RecordedChatRequest[];
};

/**
 * @param replies One reply (reused for every request) or one per request.
 */
export function mockChatRoute(replies: ChatRouteReply | ChatRouteReply[]): ChatRouteMock {
  const queue = Array.isArray(replies) ? replies : [replies];
  const requests: RecordedChatRequest[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    // The transport asks `GET /api/chat` for a single-use request token before
    // it posts (see src/lib/chat-transport.ts). Handing one back keeps the mock
    // faithful to the route, and leaving it out of `requests` keeps that list
    // meaning what it has always meant: the conversation calls the app made.
    if ((init?.method ?? "GET").toUpperCase() === "GET") {
      return new Response(
        JSON.stringify({ token: "test-chat-token", expiresInMs: 120_000 }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    requests.push({ url, body: parseBody(init?.body) });

    // Repeat the last reply if the app asks again (e.g. after a retry).
    const reply = queue[Math.min(requests.length - 1, queue.length - 1)];

    return typeof reply === "function" ? await reply() : await reply;
  });

  vi.stubGlobal("fetch", fetchMock);

  return { fetchMock, requests };
}

function parseBody(body: BodyInit | null | undefined) {
  if (typeof body !== "string") return undefined;

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}
