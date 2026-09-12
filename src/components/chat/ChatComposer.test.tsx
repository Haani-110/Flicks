import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { CHAT_LIMITS } from "@/lib/chat-contract";
import type { SendButtonState } from "@/components/StatefulSendButton";
import { ChatComposer } from "./ChatComposer";

/** Tests for the assistant's validated form. */

type ComposerOverrides = {
  sendState?: SendButtonState;
  busy?: boolean;
  errorMessage?: string | null;
};

function renderComposer(overrides: ComposerOverrides = {}) {
  const onSend = vi.fn();
  const onStop = vi.fn();
  const onRetry = vi.fn();

  renderWithProviders(
    <ChatComposer
      onSend={onSend}
      onStop={onStop}
      onRetry={onRetry}
      busy={overrides.busy ?? false}
      sendState={overrides.sendState ?? "idle"}
      errorMessage={overrides.errorMessage ?? null}
    />,
  );

  return { onSend, onStop, onRetry };
}

const textbox = () => screen.getByRole("textbox", { name: "Ask about movies" });

describe("ChatComposer", () => {
  it("exposes one labelled input, described by the sending hint", () => {
    renderComposer();

    expect(textbox()).toHaveAccessibleDescription(
      /Enter to send, Shift\+Enter for a new line\./,
    );
    expect(textbox()).toHaveAccessibleName("Ask about movies");
  });

  it("sends the trimmed message and clears the input", async () => {
    const user = userEvent.setup();
    const { onSend } = renderComposer();

    await user.type(textbox(), "  best rated movie?  ");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("best rated movie?");
    expect(textbox()).toHaveValue("");
  });

  it("sends on Enter and keeps Shift+Enter for new lines", async () => {
    const user = userEvent.setup();
    const { onSend } = renderComposer();

    await user.type(textbox(), "first line{Shift>}{Enter}{/Shift}second line");
    expect(onSend).not.toHaveBeenCalled();
    expect(textbox()).toHaveValue("first line\nsecond line");

    await user.type(textbox(), "{Enter}");
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0][0]).toContain("first line\nsecond line");
  });

  it("validates an empty submission instead of failing silently", async () => {
    const user = userEvent.setup();
    const { onSend } = renderComposer();

    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a message before sending.",
    );
    expect(textbox()).toHaveAttribute("aria-invalid", "true");
    expect(textbox()).toHaveAccessibleDescription("Enter a message before sending.");
  });

  it("rejects a whitespace-only message", async () => {
    const user = userEvent.setup();
    const { onSend } = renderComposer();

    await user.type(textbox(), "    ");
    await user.type(textbox(), "{Enter}");

    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a message before sending.",
    );
  });

  it("clears the validation error as soon as the input becomes valid", async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole("button", { name: /send/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.type(textbox(), "a");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("enforces the shared message length limit", async () => {
    const user = userEvent.setup();
    const { onSend } = renderComposer();

    await user.click(textbox());
    await user.paste("x".repeat(CHAT_LIMITS.maxMessageChars + 1));
    await user.type(textbox(), "{Enter}");

    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      `Messages must be ${CHAT_LIMITS.maxMessageChars} characters or fewer.`,
    );
  });

  it("counts the characters it will send", async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.type(textbox(), "dune");

    expect(
      screen.getByText(
        `4 / ${CHAT_LIMITS.maxMessageChars} characters`,
      ),
    ).toBeInTheDocument();
  });

  it("locks the input and offers Stop while a response is in flight", async () => {
    const user = userEvent.setup();
    const { onStop } = renderComposer({ busy: true, sendState: "loading" });

    expect(textbox()).toBeDisabled();
    expect(textbox()).toHaveAttribute("placeholder", "Waiting for response…");
    expect(screen.getByRole("status")).toHaveTextContent("Sending message…");

    await user.click(screen.getByRole("button", { name: "Stop generating" }));

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("shows a route failure and lets the reader retry from the empty composer", async () => {
    const user = userEvent.setup();
    const { onRetry, onSend } = renderComposer({
      sendState: "error",
      errorMessage: "AI is not configured.",
    });

    expect(screen.getByRole("alert")).toHaveTextContent("AI is not configured.");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Send failed. Press Retry to try again.",
    );

    await user.click(
      screen.getByRole("button", { name: "Send failed. Activate to retry." }),
    );

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSend).not.toHaveBeenCalled();
  });
});
