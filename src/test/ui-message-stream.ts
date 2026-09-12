import type { UIMessageChunk } from "ai";

/**
 * Helpers that speak the AI SDK UI message stream protocol (SSE + JSON
 * chunks) — the exact wire format `api/chat.ts` produces and
 * `DefaultChatTransport` consumes.
 *
 * Shared by the Vitest suite and the Playwright suite so both mock the AI
 * route with the same, realistic stream. This module intentionally has no
 * test-runner dependency.
 */

const encoder = new TextEncoder();

/** Serialises one chunk the way the SDK's SSE writer does. */
export function encodeChunk(chunk: UIMessageChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

export function encodeChunks(chunks: UIMessageChunk[]): string {
  return chunks.map(encodeChunk).join("");
}

export type StreamResponseOptions = {
  /** Delay before each chunk, in ms. Simulates a live stream. */
  chunkDelayMs?: number;
  /** Leave the response open after the last chunk (still streaming). */
  holdOpen?: boolean;
};

/** A 200 response that streams the given chunks as SSE. */
export function streamResponse(
  chunks: UIMessageChunk[],
  { chunkDelayMs = 0, holdOpen = false }: StreamResponseOptions = {},
): Response {
  let cancelled = false;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const chunk of chunks) {
          if (chunkDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, chunkDelayMs));
          }

          if (cancelled) return;
          controller.enqueue(encoder.encode(encodeChunk(chunk)));
        }

        if (!holdOpen && !cancelled) controller.close();
      } catch {
        // The reader went away (abort/stop): nothing left to write.
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

/** The `{ error }` JSON body api/chat.ts returns for failed requests. */
export function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** A request that is accepted but never answers — the "pending" UI state. */
export function pendingResponse(): Promise<Response> {
  return new Promise<Response>(() => {});
}
