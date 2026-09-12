import { z } from "zod";

/**
 * The client/server contract for the assistant.
 *
 * These limits and schemas are imported by the API route (through
 * `lib/flicks-ai.ts`) and by the client, so the two sides cannot drift.
 */

/** Conversation / payload limits (applied server-side). */
export const CHAT_LIMITS = {
  /** Max messages kept from history (multi-turn window). */
  maxHistoryMessages: 20,
  /** Max characters accepted per message. */
  maxMessageChars: 2000,
  /** Max messages accepted per request. */
  maxMessagesPerRequest: 30,
} as const;

/** Validation for the assistant composer — mirrors the checks in api/chat.ts. */
export const chatInputSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Enter a message before sending.")
    .max(
      CHAT_LIMITS.maxMessageChars,
      `Messages must be ${CHAT_LIMITS.maxMessageChars} characters or fewer.`,
    ),
});

export type ChatInput = z.infer<typeof chatInputSchema>;

/**
 * Output of the server-side `search_movies` tool (see lib/flicks-tools.ts).
 * The chat renders tool results through this schema, so a malformed payload
 * degrades into a readable message instead of a broken UI.
 */
export const movieSearchOutputSchema = z.object({
  query: z.string().nullable().optional(),
  genre: z.string().nullable().optional(),
  maxRuntime: z.number().nullable().optional(),
  count: z.number().int().nonnegative(),
  movies: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      year: z.number(),
      rating: z.number(),
      runtime: z.number(),
      genres: z.array(z.string()),
    }),
  ),
});

export type MovieSearchOutput = z.infer<typeof movieSearchOutputSchema>;
