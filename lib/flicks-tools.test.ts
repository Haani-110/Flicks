import { describe, expect, it } from "vitest";
import { asSchema } from "ai";
import { movies } from "../src/data/movies.js";
import { movieSearchOutputSchema } from "../src/lib/chat-contract.js";
import { flicksTools, searchMoviesTool } from "./flicks-tools.js";

/**
 * Contract tests for the server-side tool.
 *
 * The model's input goes through the tool's schema and the tool's output comes
 * back through the client's schema, so a rename on either side fails here
 * instead of silently emptying the assistant's answers.
 */

const toolOptions = { toolCallId: "contract-test", messages: [] };

type SearchOutput = {
  count: number;
  movies: { id: number; title: string }[];
};

async function runSearch(input: {
  query?: string;
  genre?: string;
  maxRuntime?: number;
}): Promise<SearchOutput> {
  const result = await searchMoviesTool.execute?.(input, toolOptions);

  if (!result || Symbol.asyncIterator in (result as object)) {
    throw new Error("search_movies must return its result directly");
  }

  return result as SearchOutput;
}

describe("search_movies tool", () => {
  it("is registered under the name the assistant prompt uses", () => {
    expect(Object.keys(flicksTools)).toEqual(["search_movies"]);
  });

  it("declares an input schema the model can fill", async () => {
    // Guards the AI SDK v6 rename: a tool declared with `parameters` instead of
    // `inputSchema` silently loses its arguments.
    expect(searchMoviesTool.inputSchema).toBeDefined();

    const validation = await asSchema(searchMoviesTool.inputSchema).validate?.({
      genre: "Sci-Fi",
      maxRuntime: 170,
    });

    expect(validation?.success).toBe(true);
  });

  it("rejects tool input that is not in the schema", async () => {
    const validation = await asSchema(searchMoviesTool.inputSchema).validate?.({
      maxRuntime: "as long as you like",
    });

    expect(validation?.success).toBe(false);
  });

  it("filters the real catalog by genre and runtime", async () => {
    const result = await runSearch({ genre: "Sci-Fi", maxRuntime: 170 });

    const expected = movies.filter(
      (movie) => movie.genres.includes("Sci-Fi") && movie.runtime <= 170,
    );

    expect(result.count).toBe(expected.length);
    expect(result.movies.map((movie) => movie.title)).toEqual(
      expected.map((movie) => movie.title),
    );
  });

  it("returns output the chat can render", async () => {
    const result = await runSearch({ query: "dune" });

    expect(movieSearchOutputSchema.safeParse(result).success).toBe(true);
    expect(result.movies[0]?.title).toContain("Dune");
  });

  it("returns an empty list rather than throwing when nothing matches", async () => {
    const result = await runSearch({ genre: "Western" });

    expect(result.count).toBe(0);
    expect(result.movies).toEqual([]);
  });
});
