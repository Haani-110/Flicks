import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DEFAULT_CONFIG } from "./config";
import { signMatrix } from "./pixel-font";
import { StaticMarquee } from "./static-marquee";

/**
 * Board bulbs are the only circles painted in the accent colour, or in the
 * "switched off" grey — everything else on the poster is ivory or metal.
 */
function bulbsWithFill(container: HTMLElement, fill: string) {
  return [...container.querySelectorAll("circle")].filter(
    (circle) => circle.getAttribute("fill")?.toLowerCase() === fill.toLowerCase(),
  );
}

describe("StaticMarquee", () => {
  it("describes itself from the settings it was given", () => {
    render(<StaticMarquee config={{ ...DEFAULT_CONFIG, signText: "MATINEE", accent: "ice" }} />);

    const poster = screen.getByRole("img");

    expect(poster).toHaveAccessibleName(
      "Premiere marquee: a cinema facade in chrome with a ice blue letter board spelling “MATINEE”.",
    );
  });

  it("draws the board from the same font the 3D sign uses", () => {
    const { container } = render(<StaticMarquee config={{ ...DEFAULT_CONFIG, signText: "AB" }} />);

    const board = signMatrix("AB");
    const litOn = board.cells.flat().filter(Boolean).length;
    const litOff = board.rows * board.cols - litOn;

    expect(bulbsWithFill(container, "#e8a73e")).toHaveLength(litOn);
    expect(bulbsWithFill(container, "#2f373c")).toHaveLength(litOff);
  });

  it("places each lit bulb on its own cell of the grid", () => {
    const { container } = render(<StaticMarquee config={{ ...DEFAULT_CONFIG, signText: "A" }} />);

    const bulbs = bulbsWithFill(container, "#e8a73e");
    expect(bulbs).toHaveLength(18);

    const positions = bulbs.map(
      (bulb) => `${bulb.getAttribute("cx")},${bulb.getAttribute("cy")}`,
    );
    expect(new Set(positions).size).toBe(18);
  });

  it("uses the accent colour the config asks for", () => {
    const { container } = render(
      <StaticMarquee config={{ ...DEFAULT_CONFIG, signText: "A", accent: "lime" }} />,
    );

    const lit = bulbsWithFill(container, "#a6e22e");

    expect(lit).toHaveLength(18);
    expect(lit.every((bulb) => bulb.getAttribute("filter") === "url(#glow)")).toBe(true);
  });

  it("takes a description for the canvas-less case", () => {
    render(<StaticMarquee config={DEFAULT_CONFIG} description="Poster for a paused scene." />);

    expect(screen.getByRole("img")).toHaveAccessibleDescription("Poster for a paused scene.");
  });
});
