import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { movies } from "@/data/movies";
import { renderWithProviders } from "@/test/render";
import { MovieDetail } from "./MovieDetail";

const movie = movies[0];

function renderDetail(id: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/movie/:id" element={<MovieDetail />} />
    </Routes>,
    { route: `/movie/${id}` },
  );
}

describe("MovieDetail page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the movie's facts from the route parameter", () => {
    renderDetail(String(movie.id));

    expect(
      screen.getByRole("heading", { level: 1, name: movie.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(movie.overview)).toBeInTheDocument();

    for (const genre of movie.genres) {
      expect(screen.getByText(genre)).toBeInTheDocument();
    }
  });

  it("adds the movie to the watchlist and shows it as saved", async () => {
    const user = userEvent.setup();
    renderDetail(String(movie.id));

    const add = screen.getByRole("button", { name: "Add to watchlist" });
    expect(add).toHaveAttribute("aria-pressed", "false");

    await user.click(add);

    expect(
      screen.getByRole("button", { name: "In watchlist" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("offers a shortcut back to the watchlist once something is saved", async () => {
    localStorage.setItem("flicks-watchlist", JSON.stringify([movies[1].id]));

    renderDetail(String(movie.id));

    expect(screen.getByRole("link", { name: /View watchlist/ })).toHaveAttribute(
      "href",
      "/watchlist",
    );
  });

  it("suggests related titles from the same genres", () => {
    renderDetail(String(movie.id));

    expect(
      screen.getByRole("heading", { name: "More like this" }),
    ).toBeInTheDocument();

    const related = movies
      .filter(
        (candidate) =>
          candidate.id !== movie.id &&
          candidate.genres.some((genre) => movie.genres.includes(genre)),
      )
      .slice(0, 4);

    expect(related.length).toBeGreaterThan(0);

    for (const candidate of related) {
      expect(
        screen.getByRole("link", { name: `${candidate.title} poster` }),
      ).toBeInTheDocument();
    }
  });

  it("explains an unknown movie id", () => {
    renderDetail("9999");

    expect(
      screen.getByRole("heading", { name: "Movie not found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to Home/ })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
