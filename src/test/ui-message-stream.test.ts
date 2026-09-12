import { describe, expect, it } from "vitest";
import { parseJsonEventStream, uiMessageChunkSchema } from "ai";
import { convertReadableStreamToArray } from "ai/test";
import { buildChatStreamChunks, buildChatStreamSse } from "./fixtures/chat-stream";
import { encodeChunk, encodeChunks, streamResponse } from "./ui-message-stream";

/**
 * The mocked AI route and the real one must speak the same protocol. This test
 * pushes the shared fixture through the SDK's own SSE parser, so a fixture that
 * drifts from the wire format fails here instead of mysteriously in the E2E run.
 */
describe("UI message stream fixture", () => {
  it("parses as the AI SDK UI message stream", async () => {
    const body = new Response(buildChatStreamSse()).body;
    expect(body).not.toBeNull();

    const parsed = await convertReadableStreamToArray(
      parseJsonEventStream({ stream: body!, schema: uiMessageChunkSchema }),
    );

    const failures = parsed.filter((chunk) => !chunk.success);
    expect(failures).toEqual([]);

    expect(
      parsed.map((chunk) => (chunk.success ? chunk.value.type : "invalid")),
    ).toEqual(buildChatStreamChunks().map((chunk) => chunk.type));
  });

  it("uses one SSE data frame per chunk", () => {
    const chunks = buildChatStreamChunks();
    const sse = buildChatStreamSse();

    expect(sse).toBe(encodeChunks(chunks));
    expect(sse.split("\n\n").filter(Boolean)).toHaveLength(chunks.length);
    expect(sse.startsWith(encodeChunk(chunks[0]))).toBe(true);
  });

  it("streams chunks in the order the app renders them", async () => {
    const response = streamResponse(buildChatStreamChunks());
    const text = await response.text();

    expect(text.indexOf('"tool-output-available"')).toBeLessThan(
      text.indexOf('"text-delta"'),
    );
    expect(text.trimEnd().endsWith('"finish"}')).toBe(true);
  });
});
