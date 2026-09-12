import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { NotFound } from "./NotFound";

describe("404 page", () => {
  it("says what happened and offers a way back", () => {
    renderWithProviders(<NotFound />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go home/ })).toHaveAttribute("href", "/");
    expect(
      screen.getByText(/doesn't exist or may have moved/i),
    ).toBeInTheDocument();
  });

  it("is one labelled region, not a second main landmark", () => {
    const { container } = renderWithProviders(<NotFound />);

    // It used to render its own <main> inside the layout's <main>.
    expect(container.querySelector("main")).toBeNull();
    expect(
      screen.getByRole("region", { name: "Page not found" }),
    ).toBeInTheDocument();
  });

  it("points at the assistant as a second way forward", () => {
    renderWithProviders(<NotFound />);

    expect(screen.getByRole("link", { name: /Ask what to watch/ })).toHaveAttribute(
      "href",
      "/assistant",
    );
  });
});
