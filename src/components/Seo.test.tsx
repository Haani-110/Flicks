import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { renderWithProviders } from "@/test/render";
import { Seo } from "./Seo";

/**
 * The document head is part of the product: a shared link and a search result
 * both read it. These tests assert what a crawler or a chat-preview scraper
 * would see for each route, including the origin-derived tags that must never
 * be hard-coded again.
 */

const meta = (key: string) =>
  document.head.querySelector(`meta[property="${key}"]`)?.getAttribute("content");

describe("Seo", () => {
  it("titles the landing route and derives the origin-bound tags", () => {
    renderWithProviders(<Seo />, { route: "/" });

    expect(document.title).toBe("Flicks — discover your next favorite film");
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      "http://localhost:3000/",
    );
    expect(meta("og:url")).toBe("http://localhost:3000/");
    expect(meta("og:image")).toBe("http://localhost:3000/og.png");
    expect(meta("og:site_name")).toBe("Flicks");
  });

  it("titles each named route", () => {
    const cases: Array<[string, string]> = [
      ["/watchlist", "Watchlist — Flicks"],
      ["/assistant", "Assistant — Flicks"],
      ["/marquee", "Marquee — Flicks"],
      ["/health", "Health check — Flicks"],
    ];

    for (const [route, title] of cases) {
      const { unmount } = renderWithProviders(<Seo />, { route });
      expect(document.title).toBe(title);
      unmount();
    }
  });

  it("uses the catalogue entry for a film page, so tag and heading agree", () => {
    renderWithProviders(<Seo />, { route: "/movie/2" });

    expect(document.title).toBe("Oppenheimer (2023) — Flicks");
    expect(meta("og:description")).toContain("Oppenheimer");
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      "http://localhost:3000/movie/2",
    );
  });

  it("falls back gracefully for an unknown film and for unknown routes", () => {
    const first = renderWithProviders(<Seo />, { route: "/movie/9999" });
    expect(document.title).toBe("Film not found — Flicks");
    first.unmount();

    renderWithProviders(<Seo />, { route: "/nowhere" });
    expect(document.title).toBe("Page not found — Flicks");
  });

  it("updates the head when the route changes", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Seo />
        <Routes>
          <Route path="/" element={<Link to="/watchlist">Go to watchlist</Link>} />
          <Route path="/watchlist" element={<span>watchlist</span>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Go to watchlist" }));

    expect(document.title).toBe("Watchlist — Flicks");
    expect(meta("og:url")).toBe("http://localhost:3000/watchlist");
  });
});
