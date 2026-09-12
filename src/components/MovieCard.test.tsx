import { beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { movies } from "@/data/movies";
import { renderWithProviders } from "@/test/render";
import { MovieCard } from "./MovieCard";

/** The watchlist toggle is the app's other high-traffic piece of UI. */

const movie = movies[0];
const addLabel = `Add ${movie.title} to watchlist`;
const removeLabel = `Remove ${movie.title} from watchlist`;

describe("MovieCard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("links to the movie and describes the poster", () => {
    renderWithProviders(<MovieCard movie={movie} />);

    expect(screen.getByRole("img", { name: `${movie.title} poster` })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: movie.title })).toHaveAttribute(
      "href",
      `/movie/${movie.id}`,
    );
  });

  it("shows the release year, rating and runtime", () => {
    renderWithProviders(<MovieCard movie={movie} />);

    expect(screen.getByText(String(movie.year))).toBeInTheDocument();
    expect(screen.getByText(movie.rating.toFixed(1))).toBeInTheDocument();
    expect(screen.getByText(`${movie.runtime} min`)).toBeInTheDocument();
  });

  it("toggles the watchlist button and reports its pressed state", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MovieCard movie={movie} />);

    const add = screen.getByRole("button", { name: addLabel });
    expect(add).toHaveAttribute("aria-pressed", "false");

    await user.click(add);

    const remove = screen.getByRole("button", { name: removeLabel });
    expect(remove).toHaveAttribute("aria-pressed", "true");

    await user.click(remove);

    expect(screen.getByRole("button", { name: addLabel })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("persists the watchlist so it survives a reload", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MovieCard movie={movie} />);

    await user.click(screen.getByRole("button", { name: addLabel }));

    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem("flicks-watchlist") ?? "[]"),
      ).toEqual([movie.id]),
    );
  });
});
