import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { Header } from "./Header";

/**
 * The first-generation app shell.
 *
 * `Header.tsx` + `AppLayout.tsx` were the original chrome for the three-route
 * app (Home / Watchlist / Health). The live shell is now `Layout.tsx` +
 * `SiteNav.tsx`, which `App.tsx` mounts; nothing in the router imports these two
 * any more. They are kept because removing code is out of scope for this
 * upgrade, and they are tested because untested code in the repo is a liability
 * whether or not it is mounted.
 *
 * These tests pin the contract they *do* have — a labelled primary navigation
 * and an accessible page skeleton with a working skip link — so that if anyone
 * ever wires them back up, they come back correct.
 */

function renderShell(path = "/watchlist") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<h1>Home page</h1>} />
          <Route path="/watchlist" element={<h1>Watchlist page</h1>} />
          <Route path="/health" element={<h1>Health page</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Header (legacy shell)", () => {
  it("renders the brand and a labelled primary navigation", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Header />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "Flicks home" }),
    ).toHaveAttribute("href", "/");

    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(nav).getAllByRole("link")).toHaveLength(3);
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Watchlist" })).toHaveAttribute(
      "href",
      "/watchlist",
    );
    expect(within(nav).getByRole("link", { name: "Health" })).toHaveAttribute(
      "href",
      "/health",
    );
  });

  it("marks the active destination, and only the active one", () => {
    render(
      <MemoryRouter initialEntries={["/health"]}>
        <Header />
      </MemoryRouter>,
    );

    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(nav).getByRole("link", { name: "Health" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(within(nav).getByRole("link", { name: "Watchlist" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});

describe("AppLayout (legacy shell)", () => {
  it("provides a skip link that targets the main landmark", () => {
    renderShell();

    const skip = screen.getByRole("link", { name: "Skip to content" });
    const main = screen.getByRole("main");

    expect(skip).toHaveAttribute("href", `#${main.id}`);
    expect(main.id).toBe("main-content");
  });

  it("renders the header once and the routed page in the outlet", () => {
    renderShell("/watchlist");

    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("heading", { level: 1, name: "Watchlist page" }),
    );
  });

  it("swaps the outlet content when a nav link is followed", async () => {
    const user = userEvent.setup();
    renderShell("/watchlist");

    expect(
      screen.getByRole("heading", { level: 1, name: "Watchlist page" }),
    ).toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    await user.click(within(nav).getByRole("link", { name: "Health" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Health page" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 1, name: "Watchlist page" }),
    ).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Health" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
