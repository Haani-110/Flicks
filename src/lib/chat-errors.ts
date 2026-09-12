/**
 * Turns anything thrown by the chat route or the stream into a sentence a
 * person can read. The route replies to failures with `{ "error": "..." }`,
 * and the AI SDK surfaces the raw response text as the error message.
 */
export function describeChatError(error: unknown): string {
  const fallback = "Something went wrong while contacting the assistant.";

  if (error === null || error === undefined) return fallback;

  const raw = error instanceof Error ? error.message : String(error);
  const trimmed = raw.trim();

  if (!trimmed) return fallback;

  if (trimmed.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && "error" in parsed) {
        const detail = (parsed as { error?: unknown }).error;
        if (typeof detail === "string" && detail.trim()) return detail.trim();
      }
    } catch {
      // Not JSON after all — fall through and show the raw text.
    }
  }

  return trimmed;
}
