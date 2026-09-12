import { beforeEach, describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { SiteNav } from "./SiteNav";

/**
 * The primary navigation.
 *
 * Two behaviours here are worth locking down beyond "the links render":
 *
 *  - On a phone the list is a disclosure panel. Escape must close it *and*
 *    return focus to the button, and opening it must move focus to the first
 *    link — otherwise a keyboard user is stranded on a page-sized menu with no
 *    way out but Tab-tab-tab.
 *  - There is exactly one navigation landmark and one set of link names at
 *    every breakpoint, and the watchlist badge is hidden from the accessible
 *    name so `link "Watchlist"` still resolves to a single element.
 */

const nav = () => screen.getByRole("navigation", { name: "Primary" });

function renderNav(route = "/") {
  return renderWithProviders(<SiteNav />, { route });
}

describe("SiteNav", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders one landmark with all five destinations", () => {
    renderNav();

    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    expect(within(nav()).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(within(nav()).getByRole("link", { name: "Watchlist" })).toHaveAttribute(
      "href",
      "/watchlist",
    );
    expect(within(nav()).getByRole("link", { name: "Assistant" })).toHaveAttribute(
      "href",
      "/assistant",
    );
    expect(within(nav()).getByRole("link", { name: "Marquee" })).toHaveAttribute(
      "href",
      "/marquee",
    );
    expect(within(nav()).getByRole("link", { name: "Health" })).toHaveAttribute(
      "href",
      "/health",
    );
  });

  it("marks the current route with aria-current", () => {
    renderNav("/watchlist");

    expect(within(nav()).getByRole("link", { name: "Watchlist" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav()).getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("toggles the disclosure panel and reports the state to AT", async () => {
    const user = userEvent.setup();
    renderNav();

    const button = within(nav()).getByRole("button", { name: "Open menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);

    const close = within(nav()).getByRole("button", { name: "Close menu" });
    expect(close).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(close.getAttribute("aria-controls")!);
    expect(panel).not.toHaveClass("hidden");

    await user.click(close);
    expect(within(nav()).getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("moves focus into the panel when it opens", async () => {
    const user = userEvent.setup();
    renderNav();

    await user.click(within(nav()).getByRole("button", { name: "Open menu" }));

    expect(within(nav()).getByRole("link", { name: "Home" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the disclosure button", async () => {
    const user = userEvent.setup();
    renderNav();

    await user.click(within(nav()).getByRole("button", { name: "Open menu" }));
    expect(within(nav()).getByRole("link", { name: "Home" })).toHaveFocus();

    await user.keyboard("{Escape}");

    const button = within(nav()).getByRole("button", { name: "Open menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("ignores keys other than Escape while open", async () => {
    const user = userEvent.setup();
    renderNav();

    await user.click(within(nav()).getByRole("button", { name: "Open menu" }));
    await user.keyboard("a");

    expect(within(nav()).getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("closes the panel when the route changes", async () => {
    const user = userEvent.setup();
    renderNav();

    await user.click(within(nav()).getByRole("button", { name: "Open menu" }));
    await user.click(within(nav()).getByRole("link", { name: "Watchlist" }));

    expect(within(nav()).getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("shows the watchlist count without polluting the link's accessible name", () => {
    localStorage.setItem("flicks-watchlist", JSON.stringify([1, 2, 3]));
    renderNav();

    // Resolves to exactly one element: the badge is aria-hidden.
    const link = within(nav()).getByRole("link", { name: "Watchlist" });
    expect(link).toHaveTextContent("3");
    expect(link.querySelector("[aria-hidden='true']")).toHaveTextContent("3");
  });

  it("hides the badge on an empty watchlist", () => {
    localStorage.setItem("flicks-watchlist", JSON.stringify([]));
    renderNav();

    expect(within(nav()).getByRole("link", { name: "Watchlist" })).not.toHaveTextContent(
      /\d/,
    );
  });
});
