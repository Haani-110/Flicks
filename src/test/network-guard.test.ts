import { describe, expect, it } from "vitest";

/**
 * Locks in the guarantee behind every other test file: an unmocked request
 * fails loudly instead of reaching an API. If this test ever fails, the rest
 * of the suite could be talking to the real network.
 */
describe("test network guard", () => {
  it("blocks the AI route until a test mocks it", async () => {
    await expect(fetch("/api/chat", { method: "POST" })).rejects.toThrow(
      /Blocked real network request to \/api\/chat/,
    );
  });

  it("blocks the model provider", async () => {
    await expect(
      fetch("https://openrouter.ai/api/v1/chat/completions"),
    ).rejects.toThrow(/Blocked real network request/);
  });
});
