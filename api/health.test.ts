import { afterEach, beforeEach, describe, expect, it } from "vitest";
import handler from "./health";

/**
 * Tests for the health probe.
 *
 * The contract a monitor relies on: 200 + `status: "ok"` on GET, no secrets in
 * the body, no caching, and a firm 405 for anything that is not a read.
 */

type RecordedResponse = {
  status: number;
  headers: Record<string, string>;
  body: unknown;
};

function createRequest(method: string) {
  return { method } as never;
}

function createResponse(): { res: never; recorded: RecordedResponse } {
  const recorded: RecordedResponse = { status: 200, headers: {}, body: null };

  const res = {
    setHeader(name: string, value: string) {
      recorded.headers[name.toLowerCase()] = value;
      return res;
    },
    status(code: number) {
      recorded.status = code;
      return res;
    },
    json(payload: unknown) {
      recorded.body = payload;
      return res;
    },
  };

  return { res: res as never, recorded };
}

describe("GET /api/health", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.VERCEL_GIT_COMMIT_SHA = "abcdef1234567890";
    process.env.VERCEL_ENV = "production";
    process.env.OPENROUTER_API_KEY = "sk-or-test-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("answers ok with build and provider metadata", () => {
    const { res, recorded } = createResponse();

    handler(createRequest("GET"), res);

    expect(recorded.status).toBe(200);
    const body = recorded.body as {
      status: string;
      service: string;
      now: number;
      build: { commit: string; environment: string };
      chat: { configured: boolean };
    };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("flicks");
    expect(typeof body.now).toBe("number");
    expect(body.build.commit).toBe("abcdef123456"); // truncated, never the sha alone
    expect(body.build.environment).toBe("production");
    expect(body.chat.configured).toBe(true);
  });

  it("never puts the provider key in the response", () => {
    const { res, recorded } = createResponse();

    handler(createRequest("GET"), res);

    expect(JSON.stringify(recorded.body)).not.toContain("sk-or-test-key");
  });

  it("reports an unconfigured chat honestly instead of failing the probe", () => {
    delete process.env.OPENROUTER_API_KEY;
    const { res, recorded } = createResponse();

    handler(createRequest("GET"), res);

    expect(recorded.status).toBe(200);
    expect((recorded.body as { chat: { configured: boolean } }).chat.configured).toBe(
      false,
    );
  });

  it("falls back to local metadata outside a Vercel build", () => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.VERCEL_ENV;
    const { res, recorded } = createResponse();

    handler(createRequest("GET"), res);

    const body = recorded.body as { build: { commit: string; environment: string } };
    expect(body.build.commit).toBe("local");
    expect(body.build.environment).toBe("development");
  });

  it("forbids caching so a stale ok can never outlive a bad deploy", () => {
    const { res, recorded } = createResponse();

    handler(createRequest("GET"), res);

    expect(recorded.headers["cache-control"]).toBe("no-store");
  });

  it.each(["POST", "PUT", "DELETE", "PATCH"])("refuses %s with 405", (method) => {
    const { res, recorded } = createResponse();

    handler(createRequest(method), res);

    expect(recorded.status).toBe(405);
    expect(recorded.headers.allow).toBe("GET, HEAD");
    expect(recorded.body).toEqual({
      error: "Method not allowed. Use GET.",
    });
  });
});
