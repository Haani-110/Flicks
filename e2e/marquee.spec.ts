import { expect, test } from "@playwright/test";

/**
 * The 3D marquee, in a real browser.
 *
 * These tests are the reason the canvas host and the scene graph are excluded
 * from the jsdom coverage run: they need a GPU-backed WebGL context, which is
 * exactly what Chromium in CI provides. The frame-rate readout is the proof
 * that the render loop is really running — it is sampled inside `useFrame`.
 */
test.describe.configure({ timeout: 90_000 });

test.describe("premiere marquee", () => {
  test("dresses the marquee and keeps the settings", async ({ page }) => {
    await page.goto("/marquee");

    const stage = page.getByRole("group", { name: "3D premiere marquee" });
    await expect(stage).toBeVisible();

    // The scene mounts on its own for a capable device, and it is rendering.
    await expect(page.getByText(/\d+ fps/)).toBeVisible({ timeout: 45_000 });

    const controls = page.getByRole("form", { name: "Marquee controls" });

    await controls.getByLabel("Sign text").fill("matinee");
    await expect(controls.getByRole("status")).toContainText("The board spells “MATINEE”");

    await controls.getByRole("radio", { name: "Gold", exact: true }).check();
    await controls.getByRole("button", { name: "Feature Oppenheimer", exact: true }).click();

    await expect(page.getByText("Featured: Oppenheimer (2023).")).toBeVisible();
    await expect(controls.getByLabel("Sign text")).toHaveValue("OPPENHEI");

    // Settings are kept between visits, like the watchlist.
    await page.reload();
    await expect(
      page
        .getByRole("form", { name: "Marquee controls" })
        .getByRole("radio", { name: "Gold", exact: true }),
    ).toBeChecked();
  });

  test("parks the render loop and falls back to the poster", async ({ page }) => {
    await page.goto("/marquee");
    await expect(page.getByText(/\d+ fps/)).toBeVisible({ timeout: 45_000 });

    await page.getByRole("button", { name: "Pause the scene" }).click();
    await expect(page.getByText(/Scene paused/)).toBeVisible();

    await page.getByRole("button", { name: "Use the static poster" }).click();

    await expect(page.getByRole("img", { name: /Premiere marquee:/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pause the scene" })).toHaveCount(0);
  });

  test("refuses a file that is not a glTF binary", async ({ page }) => {
    await page.goto("/marquee");
    await expect(page.getByText(/\d+ fps/)).toBeVisible({ timeout: 45_000 });

    await page.getByLabel("Load a .glb file").setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("this is not a model"),
    });

    await expect(page.getByRole("alert")).toContainText("Drop a binary glTF (.glb)");
  });
});
