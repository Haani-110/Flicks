import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { AppErrorBoundary } from "./error";

/**
 * The last line of defence. Untested before, which meant a regression in the
 * crash handler — the one component whose whole job is to be correct on the
 * worst day — would have shipped silently.
 */

function Boom({ message }: { message?: string }): never {
  throw new Error(message ?? "render exploded");
}

function renderBoundary(message?: string) {
  const result = renderWithProviders(
    <AppErrorBoundary>
      <Boom message={message} />
    </AppErrorBoundary>,
  );

  return result;
}

describe("AppErrorBoundary", () => {
  it("shows the child tree when nothing has thrown", () => {
    renderWithProviders(
      <AppErrorBoundary>
        <h1>All good</h1>
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: "All good" })).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("replaces a crashing page with a readable recovery screen", () => {
    // React logs the throw itself; the assertion is about the rendered result.
    vi.spyOn(console, "error").mockImplementation(() => {});

    renderBoundary();

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(within(alert).getByText("Something went wrong")).toBeInTheDocument();
    expect(
      within(alert).getByText(/return home and continue browsing/i),
    ).toBeInTheDocument();

    // Two ways out, both real controls.
    expect(within(alert).getByRole("button", { name: /Reload/ })).toBeEnabled();
    expect(within(alert).getByRole("link", { name: /Go home/ })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("announces the failure assertively so it is not missed", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    renderBoundary();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });

  it("offers the error's own message behind a disclosure, not as a stack dump", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});

    renderBoundary("Cannot read properties of undefined");

    // Not on screen until the reader asks for it.
    expect(
      screen.queryByText("Cannot read properties of undefined"),
    ).not.toBeVisible();

    await user.click(screen.getByText("Technical detail"));

    expect(screen.getByText("Cannot read properties of undefined")).toBeVisible();
  });

  it("hides the disclosure when the error carries no message", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    renderBoundary("");

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Technical detail")).not.toBeInTheDocument();
  });
});
