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
    // Bundling the app into a single HTML file is a production concern only.
    ...(mode === "test" ? [] : [viteSingleFile()]),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
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
      reporter: ["text-summary", "lcov"],
      reportsDirectory: "coverage",
      // Component-level coverage for the app UI; api/ and lib/ are covered by
      // their own contract tests (see api/chat.test.ts, lib/flicks-tools.test.ts).
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/vite-env.d.ts",
        "src/main.tsx",
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
