import { describe, expect, it } from "vitest";
import { describeChatError } from "./chat-errors";

describe("describeChatError", () => {
  it("unwraps the route's JSON error body", () => {
    expect(
      describeChatError(new Error('{"error":"AI is not configured."}')),
    ).toBe("AI is not configured.");
  });

  it("treats a streaming error part as its own message", () => {
    expect(describeChatError(new Error("The model is overloaded."))).toBe(
      "The model is overloaded.",
    );
  });

  it("falls back to a readable sentence for empty or non-error values", () => {
    expect(describeChatError(new Error("   "))).toBe(
      "Something went wrong while contacting the assistant.",
    );
    expect(describeChatError(null)).toBe(
      "Something went wrong while contacting the assistant.",
    );
    expect(describeChatError(undefined)).toBe(
      "Something went wrong while contacting the assistant.",
    );
  });

  it("keeps JSON that is not an error envelope readable", () => {
    expect(describeChatError(new Error('{"detail":"nope"}'))).toBe(
      '{"detail":"nope"}',
    );
    expect(describeChatError(new Error("{ not json"))).toBe("{ not json");
  });

  it("stringifies non-Error throwables", () => {
    expect(describeChatError("plain string failure")).toBe(
      "plain string failure",
    );
  });
});
