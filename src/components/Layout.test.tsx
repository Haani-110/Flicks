import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { Layout } from "./Layout";

describe("Layout", () => {
  it("gives every page the same navigation and footer", () => {
    renderWithProviders(<Layout />);

    expect(screen.getByRole("link", { name: "Flicks home" })).toHaveAttribute(
      "href",
      "/",
    );

    const nav = screen.getByRole("navigation");
    for (const label of ["Home", "Watchlist", "Assistant", "Health", "Marquee"]) {
      expect(within(nav).getByRole("link", { name: label })).toBeInTheDocument();
    }

    expect(
      screen.getByText(`© ${new Date().getFullYear()} Flicks. Foundations build.`),
    ).toBeInTheDocument();
  });

  it("marks the page you are on as current", () => {
    renderWithProviders(<Layout />, { route: "/watchlist" });

    expect(
      within(screen.getByRole("navigation")).getByRole("link", {
        name: "Watchlist",
      }),
    ).toHaveAttribute("aria-current", "page");
  });
});
