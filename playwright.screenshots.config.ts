import { defineConfig } from "@playwright/test";

const PORT = 4175;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Screenshot capture, kept in its own config so the test suite and the picture
 * pipeline never interfere.
 *
 * `npm run screenshots` writes docs/screenshots/*.png from the real app in a
 * real browser — the same Chromium CI tests with. The images in the README are
 * these files; `.github/workflows/screenshots.yml` re-captures and commits
 * them on demand, so a reader can trust a picture was taken from the product
 * rather than drawn beside it.
 */
export default defineConfig({
  testDir: "./e2e/capture",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "off",
    screenshot: "off",
  },

  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: { viewport: { width: 375, height: 812 } },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
