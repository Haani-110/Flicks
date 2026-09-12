import { describe, expect, it } from "vitest";
import { movies } from "@/data/movies";
import { accentKeyFor, boardTextFor, movieAccent, movieTagline } from "./movie-style";

const byTitle = (title: string) => {
  const movie = movies.find((candidate) => candidate.title === title);
  if (!movie) throw new Error(`No movie titled ${title}`);
  return movie;
};

describe("boardTextFor", () => {
  it("spells as many whole words of a title as the board holds", () => {
    // "DUNE PART" would be nine characters, one more than the board takes.
    expect(boardTextFor(byTitle("Dune: Part Two"))).toBe("DUNE");
    expect(boardTextFor({ ...movies[0], title: "WALL E" })).toBe("WALL E");
  });

  it("keeps a short title whole", () => {
    expect(boardTextFor(byTitle("Oppenheimer"))).toBe("OPPENHEI");
  });

  it("never returns more than the board can display", () => {
    for (const movie of movies) {
      expect(boardTextFor(movie).length).toBeLessThanOrEqual(8);
    }
  });

  it("has something to spell for every movie in the catalog", () => {
    for (const movie of movies) {
      expect(boardTextFor(movie).length).toBeGreaterThan(0);
    }
  });
});

describe("poster styling", () => {
  it("gives every movie an accent from the palette, stable across calls", () => {
    for (const movie of movies) {
      expect(movieAccent(movie)).toMatch(/^#[0-9a-f]{6}$/i);
      expect(movieAccent(movie)).toBe(movieAccent(movie));
    }
  });

  it("reads the poster's second line from genre and runtime", () => {
    expect(movieTagline(byTitle("Dune: Part Two"))).toBe("Sci-Fi · 166 min");
  });

  it("maps a poster accent back to a bulb colour when they overlap", () => {
    expect(accentKeyFor("#e8a73e")).toBe("amber");
    expect(accentKeyFor("#7FD7FF")).toBe("ice");
    expect(accentKeyFor("#123456")).toBeUndefined();
  });
});
