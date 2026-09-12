import { describe, expect, it } from "vitest";
import { CHAT_LIMITS as SERVER_CHAT_LIMITS } from "../../lib/flicks-ai.js";
import { SEARCH_OUTPUT } from "@/test/fixtures/chat-stream";
import {
  CHAT_LIMITS,
  chatInputSchema,
  movieSearchOutputSchema,
} from "./chat-contract";

describe("chat contract", () => {
  it("is the same limit set the API route enforces", () => {
    expect(SERVER_CHAT_LIMITS).toEqual(CHAT_LIMITS);
  });

  it("trims a valid message", () => {
    const parsed = chatInputSchema.safeParse({ message: "  Dune?  " });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.message).toBe("Dune?");
  });

  it("rejects empty and whitespace-only messages", () => {
    for (const message of ["", "   ", "\n\t"]) {
      const parsed = chatInputSchema.safeParse({ message });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toBe(
          "Enter a message before sending.",
        );
      }
    }
  });

  it("rejects messages longer than the route allows", () => {
    const parsed = chatInputSchema.safeParse({
      message: "x".repeat(CHAT_LIMITS.maxMessageChars + 1),
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(
        `Messages must be ${CHAT_LIMITS.maxMessageChars} characters or fewer.`,
      );
    }
  });

  it("accepts the tool output the chat renders", () => {
    const parsed = movieSearchOutputSchema.safeParse(SEARCH_OUTPUT);

    expect(parsed.success).toBe(true);
  });

  it("rejects a tool output the chat cannot render", () => {
    expect(movieSearchOutputSchema.safeParse({ movies: "all of them" }).success).toBe(
      false,
    );
    expect(movieSearchOutputSchema.safeParse(null).success).toBe(false);
  });
});
