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

  build: {
    // Lighthouse \"Avoid enormous network payloads\" and \"Reduce unused JS\"
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    sourcemap: false,
    // Split vendor from app so first paint is smaller and better cached.
    ...(mode === "split"
      ? {
          rollupOptions: {
            output: {
              manualChunks: {
                vendor: ["react", "react-dom", "react-router-dom"],
                // three.js is already isolated via dynamic import (marquee-viewport),
                // but this ensures any incidental three usage does not leak into the main chunk.
              },
            },
          },
        }
      : {}),
  },

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
      // Ratchet. The suite measured 93.25% statements / 87.70% branches /
      // 95.80% functions / 95.29% lines over 44 files when these numbers were
      // set; each threshold sits ~3 points below that so a single new component
      // does not trip CI, but deleting a test file (or shipping a page with no
      // tests) does. Raising coverage is expected to mean raising these too.
      thresholds: {
        statements: 90,
        branches: 84,
        functions: 92,
        lines: 92,
      },
    },
  },
}));
