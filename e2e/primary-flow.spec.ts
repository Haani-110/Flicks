import { expect, test } from "@playwright/test";

/**
 * The primary flow a visitor walks through: discover a movie, open it, save it
 * to the watchlist, and find it still there after a reload.
 */
test("a visitor saves a movie to the watchlist and it survives a reload", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Find your next favorite film." }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Dune: Part Two" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Dune: Part Two" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add to watchlist" }).click();
  await expect(page.getByRole("button", { name: "In watchlist" })).toBeVisible();
  await expect(page.getByRole("button", { name: "In watchlist" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // The header stays reachable from the detail page.
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Watchlist" })
    .click();

  await expect(page.getByRole("heading", { name: "Watchlist" })).toBeVisible();
  await expect(page.getByText("1 movie")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove Dune: Part Two from watchlist" }),
  ).toBeVisible();

  // Reloading proves the watchlist is stored, not just held in memory.
  await page.reload();

  await expect(
    page.getByRole("button", { name: "Remove Dune: Part Two from watchlist" }),
  ).toBeVisible();

  // Removing it brings the empty state back.
  await page
    .getByRole("button", { name: "Remove Dune: Part Two from watchlist" })
    .click();

  await expect(page.getByText("No movies yet")).toBeVisible();
});
