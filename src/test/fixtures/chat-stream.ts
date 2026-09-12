import type { UIMessageChunk } from "ai";
import { movies } from "../../data/movies";
import { encodeChunks } from "../ui-message-stream";

/**
 * A recorded assistant turn, shaped exactly like the one api/chat.ts streams:
 * a `search_movies` tool call, its result computed from the real catalog, then
 * the answer text in deltas.
 *
 * Both suites mock the AI route with this fixture, so component tests and the
 * end-to-end test assert against the same payload — and neither calls a model.
 */

export const CHAT_QUESTION = "Which sci-fi movies run under three hours?";

export const SEARCH_INPUT = { genre: "Sci-Fi", maxRuntime: 170 } as const;

export const SEARCH_MATCHES = movies.filter(
  (movie) =>
    movie.genres.includes(SEARCH_INPUT.genre) &&
    movie.runtime <= SEARCH_INPUT.maxRuntime,
);

/** Mirrors the object returned by the `search_movies` tool. */
export const SEARCH_OUTPUT = {
  query: null,
  genre: SEARCH_INPUT.genre,
  maxRuntime: SEARCH_INPUT.maxRuntime,
  count: SEARCH_MATCHES.length,
  movies: SEARCH_MATCHES.map((movie) => ({
    id: movie.id,
    title: movie.title,
    year: movie.year,
    rating: movie.rating,
    runtime: movie.runtime,
    genres: movie.genres,
  })),
};

export const TOOL_CALL_ID = "call_search_movies_fixture_1";

function joinTitles(titles: string[]): string {
  if (titles.length <= 1) return titles.join("");
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

export const CHAT_ANSWER = `I found ${SEARCH_MATCHES.length} sci-fi titles under ${SEARCH_INPUT.maxRuntime} minutes: ${joinTitles(
  SEARCH_MATCHES.map((movie) => movie.title),
)}.`;

/** Split the answer into deltas so the UI really has to assemble them. */
function answerDeltas(): string[] {
  const words = CHAT_ANSWER.split(" ");
  const size = 6;
  const deltas: string[] = [];

  for (let index = 0; index < words.length; index += size) {
    const slice = words.slice(index, index + size).join(" ");
    deltas.push(index + size >= words.length ? slice : `${slice} `);
  }

  return deltas;
}

/** The chunks the route would emit for this turn, in order. */
export function buildChatStreamChunks(): UIMessageChunk[] {
  return [
    { type: "start", messageId: "assistant-fixture-1" },
    { type: "start-step" },
    { type: "tool-input-start", toolCallId: TOOL_CALL_ID, toolName: "search_movies" },
    {
      type: "tool-input-available",
      toolCallId: TOOL_CALL_ID,
      toolName: "search_movies",
      input: { ...SEARCH_INPUT },
    },
    {
      type: "tool-output-available",
      toolCallId: TOOL_CALL_ID,
      output: SEARCH_OUTPUT,
    },
    { type: "finish-step" },
    { type: "start-step" },
    { type: "text-start", id: "text-fixture-1" },
    ...answerDeltas().map((delta) => ({
      type: "text-delta" as const,
      id: "text-fixture-1",
      delta,
    })),
    { type: "text-end", id: "text-fixture-1" },
    { type: "finish-step" },
    { type: "finish" },
  ];
}

/** The fixture as an SSE body, ready for `page.route(...).fulfill(...)`. */
export function buildChatStreamSse(): string {
  return encodeChunks(buildChatStreamChunks());
}
