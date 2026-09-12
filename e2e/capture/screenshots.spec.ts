import { expect, test, type Page } from "@playwright/test";
import {
  buildChatStreamSse,
  CHAT_QUESTION,
} from "../../src/test/fixtures/chat-stream";

/**
 * Screenshot capture for the README.
 *
 * Every image in docs/screenshots/ comes from this file: the real app, in real
 * Chromium, against the dev server, with the AI route served from the same
 * recorded stream fixture the tests use (so a capture never spends model
 * credit and never depends on the provider being up).
 *
 * Determinism rules: fonts and images are awaited, animations get a beat to
 * settle, and each shot has a fixed viewport. Re-run with `npm run screenshots`
 * (or the Screenshots workflow) and the pictures refresh with the product.
 */

const OUT = "docs/screenshots";

const desktop = () => test.info().project.name === "desktop";
const mobile = () => test.info().project.name === "mobile";

async function settle(page: Page, ms = 900) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(ms);
}

async function mockChat(page: Page) {
  const sse = buildChatStreamSse();
  await page.route("**/api/chat", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: "capture-token", expiresInMs: 120_000 }),
      });
      return;
    }
    route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1",
      },
      body: sse,
    });
  });
}

test("home", async ({ page }) => {
  await page.goto("/");
  await settle(page, 1400); // let the hero shader paint a representative frame

  await page.screenshot({
    path: `${OUT}/home-${test.info().project.name}.png`,
  });
});

test("film detail", async ({ page }) => {
  test.skip(mobile(), "desktop-only capture");

  await page.goto("/movie/1");
  await settle(page);

  await page.screenshot({ path: `${OUT}/movie-detail-desktop.png` });
});

test("watchlist with saved films", async ({ page }) => {
  test.skip(mobile(), "desktop-only capture");

  await page.addInitScript(() => {
    localStorage.setItem("flicks-watchlist", JSON.stringify([1, 3, 5]));
  });
  await page.goto("/watchlist");
  await settle(page);

  await page.screenshot({ path: `${OUT}/watchlist-desktop.png` });
});

test("assistant, empty state", async ({ page }) => {
  test.skip(mobile(), "desktop-only capture");

  await mockChat(page);
  await page.goto("/assistant");
  await settle(page);

  await page.screenshot({ path: `${OUT}/assistant-empty-desktop.png` });
});

test("assistant, mid-conversation", async ({ page }) => {
  test.skip(mobile(), "desktop-only capture");

  await mockChat(page);
  await page.goto("/assistant");
  await settle(page, 400);

  const chat = page.getByRole("region", { name: "Assistant chat" });
  await chat.getByRole("textbox", { name: "Ask about movies" }).fill(CHAT_QUESTION);
  await chat.getByRole("button", { name: "Send message" }).click();

  // The streamed answer, including its tool-call card, fully settled.
  await expect(
    chat.getByRole("article", { name: "Assistant message" }),
  ).not.toHaveAttribute("aria-busy", "true");
  await settle(page, 600);

  await page.screenshot({ path: `${OUT}/assistant-conversation-desktop.png` });
});

test("marquee stage", async ({ page }) => {
  test.skip(mobile(), "desktop-only capture");

  await page.goto("/marquee");
  // The scene probes the GPU, loads DRACO and builds the bulb grid; give it a
  // generous beat and then require the canvas to actually be there.
  await page.waitForTimeout(3500);
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.waitForTimeout(1200);

  await page.screenshot({ path: `${OUT}/marquee-desktop.png` });
});

test("health diagnostics", async ({ page }) => {
  test.skip(mobile(), "desktop-only capture");

  await page.route("**/api/health", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "ok",
        service: "flicks",
        now: Date.now(),
        build: { commit: "capture", environment: "preview" },
        chat: { configured: true },
      }),
    }),
  );

  await page.goto("/health");
  await expect(page.getByText("OK", { exact: true })).toBeVisible();
  await settle(page, 400);

  await page.screenshot({ path: `${OUT}/health-desktop.png` });
});
