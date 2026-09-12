import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { movies } from "@/data/movies";
import { renderWithProviders } from "@/test/render";
import { Watchlist } from "./Watchlist";

const STORAGE_KEY = "flicks-watchlist";

describe("Watchlist page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("invites browsing when nothing is saved yet", () => {
    renderWithProviders(<Watchlist />);

    expect(screen.getByRole("heading", { name: "Watchlist" })).toBeInTheDocument();
    expect(screen.getByText("No movies yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse movies/ })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("lists the saved movies and counts them", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([movies[0].id, movies[1].id]));

    renderWithProviders(<Watchlist />);

    expect(screen.getByRole("link", { name: movies[0].title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: movies[1].title })).toBeInTheDocument();
    expect(screen.getByText("2 movies")).toBeInTheDocument();
    expect(screen.queryByText("No movies yet")).not.toBeInTheDocument();
  });
});
