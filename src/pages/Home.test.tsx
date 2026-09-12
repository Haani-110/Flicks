import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { movies } from "@/data/movies";
import { renderWithProviders } from "@/test/render";
import { Home } from "./Home";

describe("Home page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows every catalog movie to a first-time visitor", () => {
    renderWithProviders(<Home />);

    expect(
      screen.getByRole("heading", { name: "Find your next favorite film." }),
    ).toBeInTheDocument();

    for (const movie of movies) {
      expect(screen.getByRole("link", { name: movie.title })).toBeInTheDocument();
    }

    expect(
      screen.queryByRole("link", { name: /Open Watchlist/ }),
    ).not.toBeInTheDocument();
  });

  it("offers the watchlist with a count once something is saved", () => {
    localStorage.setItem("flicks-watchlist", JSON.stringify([movies[0].id]));

    renderWithProviders(<Home />);

    expect(screen.getByRole("link", { name: /Open Watchlist/ })).toHaveTextContent(
      "1",
    );
  });
});
