import { tool } from "ai";
import { z } from "zod";
import { movies } from "../src/data/movies.js";

/**
 * Server-side Flicks tools.
 *
 * These tools are only imported by the API route.
 * They must never be exposed directly to the browser.
 */

/**
 * Search the Flicks movie catalog using optional filters.
 *
 * The model can provide:
 * - query: title/overview keyword
 * - genre: genre filter
 * - maxRuntime: maximum runtime in minutes
 */
export const searchMoviesTool = tool({
  description:
    "Search the Flicks movie catalog. Use this when the user asks to find, recommend, filter, or compare movies based on title, genre, keywords, or runtime.",

  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        "Optional keyword to search for in movie titles or descriptions."
      ),

    genre: z
      .string()
      .optional()
      .describe(
        "Optional genre such as Action, Drama, Comedy, Sci-Fi, Adventure, Crime, or History."
      ),

    maxRuntime: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Optional maximum movie runtime in minutes."
      ),
  }),

  execute: async ({ query, genre, maxRuntime }) => {
    // Small delay makes the tool lifecycle visible during development.
    // Remove this delay later if desired.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const normalizedQuery = query?.trim().toLowerCase();
    const normalizedGenre = genre?.trim().toLowerCase();

    const results = movies.filter((movie) => {
      const matchesQuery =
        !normalizedQuery ||
        movie.title.toLowerCase().includes(normalizedQuery) ||
        movie.overview.toLowerCase().includes(normalizedQuery);

      const matchesGenre =
        !normalizedGenre ||
        movie.genres.some(
          (movieGenre) =>
            movieGenre.toLowerCase() === normalizedGenre
        );

      const matchesRuntime =
        maxRuntime === undefined ||
        movie.runtime <= maxRuntime;

      return (
        matchesQuery &&
        matchesGenre &&
        matchesRuntime
      );
    });

    return {
      query: query ?? null,
      genre: genre ?? null,
      maxRuntime: maxRuntime ?? null,
      count: results.length,

      movies: results.map((movie) => ({
        id: movie.id,
        title: movie.title,
        year: movie.year,
        rating: movie.rating,
        posterPath: movie.posterPath,
        genres: movie.genres,
        overview: movie.overview,
        runtime: movie.runtime,
      })),
    };
  },
});

/**
 * All tools available to the Flicks assistant.
 */
export const flicksTools = {
  search_movies: searchMoviesTool,
};
