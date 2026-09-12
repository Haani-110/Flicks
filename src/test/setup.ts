/**
 * Global test setup (Vitest + React Testing Library).
 *
 * Two jobs:
 *  1. Fill the jsdom gaps the chat UI needs.
 *  2. Make sure a test can never reach a real API: every unmocked `fetch`
 *     call fails loudly instead of hitting the network.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// jsdom does not implement Element.scrollTo and the chat transcript calls it
// while following new messages.
Object.defineProperty(Element.prototype, "scrollTo", {
  configurable: true,
  writable: true,
  value: () => {},
});

// jsdom does not implement matchMedia; the send-button motion system asks for
// `prefers-reduced-motion` in CSS only today, but guard anyway.
if (typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

beforeEach(() => {
  // Tests must mock the AI route explicitly (see src/test/mock-chat-route.ts).
  // Anything else is a bug: this project's tests never touch the network.
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      throw new Error(
        `Blocked real network request to ${url}. ` +
          "Mock the route instead — see src/test/mock-chat-route.ts.",
      );
    }),
  );
});

afterEach(() => {
  cleanup();
});
