import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { Marquee } from "./Marquee";

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Marquee page", () => {
  it("introduces the experience", () => {
    renderWithProviders(<Marquee />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Premiere marquee" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/cinema facade you can dress/)).toBeInTheDocument();
  });

  it("ships the stage and the configurator on the same page", () => {
    renderWithProviders(<Marquee />);

    expect(screen.getByRole("group", { name: "3D premiere marquee" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Configurator" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Marquee controls" })).toBeInTheDocument();
  });

  it("explains what keeps the scene cheap", () => {
    renderWithProviders(<Marquee />);

    expect(screen.getByRole("heading", { level: 2, name: "Under the hood" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Nothing to download" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Lazy by default" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Three tiers" })).toBeInTheDocument();
  });

  it("starts from the poster, because this test device has no WebGL", () => {
    renderWithProviders(<Marquee />);

    expect(screen.getByRole("img", { name: /Premiere marquee:/ })).toBeInTheDocument();
  });
});
