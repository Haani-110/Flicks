import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { PosterImage } from "./PosterImage";

/**
 * A poster has three real outcomes on a live network, and the third one used to
 * be a browser broken-image icon next to a movie title.
 */

const SRC = "https://image.tmdb.org/t/p/w500/example.jpg";

describe("PosterImage", () => {
  beforeEach(() => {
    // jsdom never fires load/error on its own; each case drives them by hand.
  });

  it("describes the poster and keeps its dimensions so the grid cannot shift", () => {
    renderWithProviders(
      <PosterImage src={SRC} alt="Dune: Part Two poster" title="Dune: Part Two" />,
    );

    const image = screen.getByRole("img", { name: "Dune: Part Two poster" });

    expect(image).toHaveAttribute("width", "500");
    expect(image).toHaveAttribute("height", "750");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("decoding", "async");
  });

  it("holds a skeleton until the bytes arrive, then reveals the art", () => {
    const { container } = renderWithProviders(
      <div className="relative">
        <PosterImage src={SRC} alt="Dune: Part Two poster" title="Dune: Part Two" />
      </div>,
    );

    const image = screen.getByRole("img", { name: "Dune: Part Two poster" });
    expect(image.className).toContain("opacity-0");
    expect(container.querySelector(".skeleton")).not.toBeNull();

    fireEvent.load(image);

    expect(image.className).toContain("opacity-100");
    expect(container.querySelector(".skeleton")).toBeNull();
  });

  it("fetches an above-the-fold poster eagerly and at high priority", () => {
    renderWithProviders(
      <PosterImage src={SRC} alt="Hero poster" title="Hero" priority />,
    );

    const image = screen.getByRole("img", { name: "Hero poster" });
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
  });

  it("replaces a broken poster with a labelled placeholder naming the film", () => {
    renderWithProviders(
      <PosterImage src={SRC} alt="Dune: Part Two poster" title="Dune: Part Two" />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Dune: Part Two poster" }));

    // The broken <img> is gone, so nothing is handed both a broken image and a
    // placeholder; what remains says which film it stood in for.
    expect(screen.queryByRole("img", { name: "Dune: Part Two poster" })).toBeNull();
    expect(
      screen.getByRole("img", { name: "Dune: Part Two poster unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dune: Part Two")).toBeInTheDocument();
    expect(screen.getByText("Poster unavailable")).toBeInTheDocument();
  });
});
