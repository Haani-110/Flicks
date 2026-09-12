import { describe, expect, it, vi, type Mock } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { movies, type Movie } from "@/data/movies";
import { renderWithProviders } from "@/test/render";
import { ConfigPanel } from "./config-panel";
import { DEFAULT_CONFIG, type MarqueeConfig } from "./config";

type Handlers = {
  onChange: Mock<(change: Partial<MarqueeConfig>) => void>;
  onReset: Mock<() => void>;
  onFeatureMovie: Mock<(movie: Movie) => void>;
};

function setup(config: Partial<MarqueeConfig> = {}, featuredId?: number) {
  const handlers: Handlers = {
    onChange: vi.fn(),
    onReset: vi.fn(),
    onFeatureMovie: vi.fn(),
  } satisfies Handlers;

  renderWithProviders(
    <ConfigPanel
      config={{ ...DEFAULT_CONFIG, ...config }}
      onChange={handlers.onChange}
      onReset={handlers.onReset}
      dirty
      movies={movies}
      featuredId={featuredId}
      onFeatureMovie={handlers.onFeatureMovie}
    />,
  );

  return handlers;
}

describe("ConfigPanel", () => {
  it("lets the reader pick a finish and reports it", async () => {
    const { onChange } = setup();
    const user = userEvent.setup();

    expect(screen.getByRole("radio", { name: "Chrome" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Gold" }));

    expect(onChange).toHaveBeenCalledWith({ finish: "gold" });
  });

  it("offers every bulb colour with a visible name", async () => {
    const { onChange } = setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("radio", { name: "Premiere magenta" }));

    expect(onChange).toHaveBeenCalledWith({ accent: "magenta" });
  });

  it("swaps the centerpiece part", async () => {
    const { onChange } = setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("radio", { name: "Projector" }));

    expect(onChange).toHaveBeenCalledWith({ centerpiece: "projector" });
  });

  it("sends what was typed for the letter board", async () => {
    const { onChange } = setup();
    const user = userEvent.setup();

    const field = screen.getByLabelText("Sign text");
    await user.clear(field);
    await user.type(field, "Matinee");

    expect(onChange).toHaveBeenLastCalledWith({ signText: "Matinee" });
    expect(field).toHaveValue("Matinee");
  });

  it("says what the board will actually spell", async () => {
    setup();
    const user = userEvent.setup();

    const field = screen.getByLabelText("Sign text");
    await user.clear(field);
    await user.type(field, "sold#out");

    expect(screen.getByRole("status")).toHaveTextContent("The board spells “SOLD OUT”");
    expect(screen.getByRole("status")).toHaveTextContent("Dropped: #");
    expect(screen.getByRole("status")).toHaveTextContent("of 47 bulb columns");
  });

  it("says when the board could not fit everything", async () => {
    setup();
    const user = userEvent.setup();

    const field = screen.getByLabelText("Sign text");
    await user.clear(field);
    await user.type(field, "double bill");

    expect(screen.getByRole("status")).toHaveTextContent("did not fit");
  });

  it("turns the motion switches into config changes", async () => {
    const { onChange } = setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("checkbox", { name: "Bulb chase" }));
    expect(onChange).toHaveBeenCalledWith({ bulbChase: false });

    await user.click(screen.getByRole("checkbox", { name: "Follow the pointer" }));
    expect(onChange).toHaveBeenCalledWith({ followCursor: false });

    await user.click(screen.getByRole("checkbox", { name: "X-ray the metal" }));
    expect(onChange).toHaveBeenCalledWith({ wireframe: true });
  });

  it("reports the orbit speed in revolutions per minute", () => {
    const { onChange } = setup({ autoRotate: 0.4 });

    const slider = screen.getByLabelText("Auto-rotate (revolutions per minute)");
    expect(slider).toHaveValue("0.4");

    fireEvent.change(slider, { target: { value: "1.5" } });

    expect(onChange).toHaveBeenCalledWith({ autoRotate: 1.5 });
  });

  it("adapts brightness instead of leaving a scene too dark or blown out", () => {
    const { onChange } = setup({ exposure: 1.1 });

    fireEvent.change(screen.getByLabelText("Brightness"), { target: { value: "0.8" } });

    expect(onChange).toHaveBeenCalledWith({ exposure: 0.8 });
  });

  it("features a movie by name and marks the one that is featured", async () => {
    const { onFeatureMovie } = setup({}, movies[0].id);
    const user = userEvent.setup();

    const dune = screen.getByRole("button", { name: `Feature ${movies[0].title}` });
    expect(dune).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: `Feature ${movies[1].title}` })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(screen.getByRole("button", { name: `Feature ${movies[1].title}` }));

    expect(onFeatureMovie).toHaveBeenCalledWith(movies[1]);
  });

  it("keeps reset out of reach until something changed", async () => {
    const handlers = setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Reset settings" }));

    expect(handlers.onReset).toHaveBeenCalledTimes(1);
  });

  it("rolls a whole new look when asked to surprise", async () => {
    const { onChange } = setup();
    const user = userEvent.setup();
    vi.spyOn(Math, "random").mockReturnValue(0);

    await user.click(screen.getByRole("button", { name: "Surprise me" }));

    expect(onChange).toHaveBeenCalledWith({
      finish: "chrome",
      accent: "amber",
      centerpiece: "reel",
      signText: "FLICKS",
    });
    expect(screen.getByLabelText("Sign text")).toHaveValue("FLICKS");
  });
});
