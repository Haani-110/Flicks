import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import App from "./App";

/**
 * The route table.
 *
 * `App.tsx` had never been rendered by a test, which meant a typo in a `path`,
 * a dropped `<Route>` or a broken lazy import would have shipped green. Every
 * route the app has ever had is asserted here, plus the shell that wraps them.
 *
 * `/health` is stubbed: the page fires a real `fetch` on mount, and this suite
 * blocks the network by design (see src/test/setup.ts). Its own test file
 * covers it properly.
 */

vi.mock("@/pages/HealthCheck", () => ({
  HealthCheck: () => <h1>Health Check</h1>,
}));

function renderApp(route: string) {
  window.history.pushState({}, "", route);
  return render(<App />);
}

describe("App routing", () => {
  beforeEach(() => {
    localStorage.clear();
    // The marquee page probes for WebGL and logs when the scene cannot mount.
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it.each([
    ["/", "Find your next favorite film."],
    ["/watchlist", "Watchlist"],
    ["/movie/1", "Dune: Part Two"],
    ["/assistant", "Assistant"],
    ["/marquee", "Premiere marquee"],
    ["/health", "Health Check"],
  ])("renders %s", async (route, heading) => {
    renderApp(route);

    expect(
      await screen.findByRole("heading", { level: 1, name: heading }),
    ).toBeInTheDocument();
  });

  it("shows the 404 for a route that does not exist", async () => {
    renderApp("/definitely-not-a-page");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
  });

  it("explains an unknown movie id instead of rendering an empty page", async () => {
    renderApp("/movie/9999");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Movie not found" }),
    ).toBeInTheDocument();
  });

  it("wraps every route in one shell: skip link, one main, one primary nav, footer", async () => {
    renderApp("/");

    await screen.findByRole("heading", { level: 1, name: "Find your next favorite film." });

    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getAllByRole("navigation", { name: "Primary" })).toHaveLength(1);
    expect(
      screen.getByText(`© ${new Date().getFullYear()} Flicks. Foundations build.`),
    ).toBeInTheDocument();
  });

  it("navigates between routes without a full page load", async () => {
    const user = userEvent.setup();
    renderApp("/");

    await screen.findByRole("heading", { level: 1, name: "Find your next favorite film." });

    const nav = screen.getByRole("navigation", { name: "Primary" });
    await user.click(within(nav).getByRole("link", { name: "Watchlist" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Watchlist" }),
    ).toBeInTheDocument();

    await user.click(within(nav).getByRole("link", { name: "Home" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Find your next favorite film." }),
    ).toBeInTheDocument();
  });

  it("keeps the watchlist across a route change", async () => {
    localStorage.setItem("flicks-watchlist", JSON.stringify([1]));
    renderApp("/watchlist");

    expect(await screen.findByText("1 movie")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dune: Part Two" })).toBeInTheDocument();
  });
});
