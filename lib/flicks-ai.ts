import { movies } from "../src/data/movies";

/**
 * Single source of truth for Flicks AI configuration.
 *
 * Provider: OpenRouter (via @openrouter/ai-sdk-provider + `ai` streamText).
 * The API key lives server-side only (OPENROUTER_API_KEY) and is read
 * exclusively inside `api/chat.ts` — never on the client.
 */

/** OpenRouter model ID. Centralized here — do not scatter model names. */
export const OPENROUTER_MODEL_ID = "openai/gpt-4o-mini";

/** Generation settings passed to streamText. */
export const GENERATION_SETTINGS = {
  temperature: 0.7,
  maxOutputTokens: 800,
} as const;

/** Conversation / payload limits (applied server-side). */
export const CHAT_LIMITS = {
  /** Max messages kept from history (multi-turn window). */
  maxHistoryMessages: 20,
  /** Max characters accepted per message. */
  maxMessageChars: 2000,
  /** Max messages accepted per request. */
  maxMessagesPerRequest: 30,
} as const;

/** Roles the chat API accepts from the client. */
export const ALLOWED_ROLES = ["user", "assistant"] as const;
export type AllowedRole = (typeof ALLOWED_ROLES)[number];

export type ChatMessage = {
  role: AllowedRole;
  content: string;
};

/**
 * Builds a plain-text snapshot of the real Flicks catalog from
 * `src/data/movies.ts`. This is the only catalog source — no fake data.
 */
export function buildCatalogContext(): string {
  const lines = movies.map(
    (m) =>
      `- ${m.title} (${m.year}) — rating ${m.rating.toFixed(1)}/10, ${m.runtime} min, genres: ${m.genres.join(", ")}. ${m.overview}`
  );
  return [
    "Flicks catalog (9 movies):",
    ...lines,
    "Best rated: Spider-Man: Across the Spider-Verse (8.4), Dune: Part Two (8.3), Top Gun: Maverick (8.2).",
  ].join("\n");
}

/** System prompt grounding the assistant in the Flicks catalog. */
export function buildSystemPrompt(): string {
  return [
    "You are the Flicks movie assistant. Answer questions about the Flicks movie catalog.",
    "Use ONLY the catalog below for movie facts (titles, years, ratings, runtimes, genres, overviews).",
    "If asked about a movie not in the catalog, say it is not in the Flicks catalog and suggest similar catalog titles.",
    "Be concise and friendly. Use plain text only: short paragraphs or simple dash lists.",
    "Do NOT use Markdown headings, bold/italic markers, tables, or code blocks — the UI renders plain text.",
    "",
    buildCatalogContext(),
  ].join("\n");
}
