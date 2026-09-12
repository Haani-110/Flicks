import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // Bundling the app into a single HTML file is the default production build.
    // `npm run build:split` turns that off so the 3D route's chunk can be
    // fetched on demand instead of inlined into index.html.
    ...(mode === "test" || mode === "split" ? [] : [viteSingleFile()]),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  server: {
    // The dev server is reachable from the sandbox's preview proxy, which
    // forwards to whatever host name the browser used.
    allowedHosts: true,
    watch: {
      // Test and build output lands in the tree; reloading the page every time
      // a coverage report is written helps nobody.
      ignored: ["**/coverage/**", "**/dist/**", "**/playwright-report/**", "**/test-results/**"],
    },
  },

  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "lib/**/*.test.ts", "api/**/*.test.ts"],
    // Playwright owns the end-to-end suite; Vitest owns component tests.
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      // Component-level coverage for the app UI; api/ and lib/ are covered by
      // their own contract tests (see api/chat.test.ts, lib/flicks-tools.test.ts).
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/vite-env.d.ts",
        "src/main.tsx",
        // Needs a GPU, so it cannot run in jsdom: the canvas host and the
        // three.js scene graph are covered end to end instead (e2e/marquee.spec.ts
        // drives the real scene in Chromium). Everything they depend on — the
        // font, the bulb layout, the scroll maths, the material presets, the
        // tiers and the drop handling — is tested in this suite.
        "src/features/marquee/marquee-viewport.tsx",
        "src/features/marquee/scene/**",
      ],
      // Ratchet: a couple of points below the level the suite holds today, so
      // dropping tests (or adding untested UI) fails CI.
      thresholds: {
        statements: 72,
        branches: 74,
        functions: 70,
        lines: 76,
      },
    },
  },
}));
