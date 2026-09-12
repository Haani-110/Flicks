import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChatStatus, UIMessage } from "ai";
import { CHAT_SUGGESTIONS, ChatTranscript } from "./ChatTranscript";

/**
 * The conversation scroller.
 *
 * The follow-along rule is the part that is easy to get wrong and impossible to
 * see in a screenshot: new content must pull the view down *only* while the
 * reader is already at the bottom. Someone scrolling back through a long answer
 * should never be yanked to the newest token — and while they are not at the
 * bottom, a "Jump to latest" affordance has to appear and actually work.
 *
 * jsdom does no layout, so the scroll metrics are stubbed and `scrollTo` is
 * spied on. That is enough to assert the decision the component makes.
 */

const VIEWPORT = 400;
const SLACK = 80;

const log = () => screen.getByRole("log", { name: "Conversation" });

function message(id: string, role: "user" | "assistant", text: string): UIMessage {
  return { id, role, parts: [{ type: "text", text }] };
}

function ui(
  messages: UIMessage[],
  status: ChatStatus,
  onSuggestion: (text: string) => void = () => {},
) {
  return (
    <ChatTranscript
      messages={messages}
      status={status}
      onSuggestion={onSuggestion}
    />
  );
}

let scrollTo: ReturnType<typeof vi.fn>;

/** Makes the log look like a `content`-tall scroller parked at `scrollTop`. */
function mockScrollMetrics(content: number, scrollTop: number) {
  Object.defineProperty(log(), "scrollHeight", {
    value: content,
    configurable: true,
  });
  Object.defineProperty(log(), "clientHeight", {
    value: VIEWPORT,
    configurable: true,
  });
  Object.defineProperty(log(), "scrollTop", {
    value: scrollTop,
    writable: true,
    configurable: true,
  });
}

describe("ChatTranscript", () => {
  beforeEach(() => {
    scrollTo = vi.fn();
    // jsdom ships no Element.prototype.scrollTo, and the component calls it.
    Element.prototype.scrollTo = scrollTo as unknown as Element["scrollTo"];
  });

  it("exposes the conversation as a polite live region", () => {
    render(ui([], "ready"));

    expect(log()).toHaveAttribute("aria-live", "polite");
    expect(log()).toHaveAttribute("aria-relevant", "additions text");
    expect(log()).toHaveAttribute("aria-atomic", "false");
  });

  it("offers the starter suggestions when empty, and reports the pick", async () => {
    const user = userEvent.setup();
    const onSuggestion = vi.fn();
    render(ui([], "ready", onSuggestion));

    expect(screen.getByText("Try one of these to get started:")).toBeInTheDocument();

    for (const suggestion of CHAT_SUGGESTIONS) {
      await user.click(screen.getByRole("button", { name: suggestion }));
      expect(onSuggestion).toHaveBeenLastCalledWith(suggestion);
    }

    expect(onSuggestion).toHaveBeenCalledTimes(CHAT_SUGGESTIONS.length);
  });

  it("disables the suggestions while a turn is in flight", () => {
    render(ui([], "submitted"));

    for (const suggestion of CHAT_SUGGESTIONS) {
      expect(screen.getByRole("button", { name: suggestion })).toBeDisabled();
    }
  });

  it("shows a pending assistant bubble before the first chunk arrives", () => {
    render(ui([message("1", "user", "What movies are available?")], "submitted"));

    expect(
      screen.getByRole("article", { name: "Your message" }),
    ).toHaveTextContent("What movies are available?");
    // The stand-in assistant message keeps the "thinking" beat visible.
    expect(
      screen.getByRole("status", { name: "Assistant is thinking" }),
    ).toBeInTheDocument();
  });

  it("marks the last message as streaming while chunks arrive", () => {
    render(
      ui(
        [
          message("1", "user", "Hi"),
          message("2", "assistant", "Hello"),
        ],
        "streaming",
      ),
    );

    expect(
      screen.getByRole("article", { name: "Assistant message" }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("follows new content while the reader is at the bottom", async () => {
    const one = [message("1", "user", "Hi")];
    const two = [...one, message("2", "assistant", "Hello")];

    const { rerender } = render(ui(one, "ready"));
    mockScrollMetrics(900, 500); // 900 - 500 - 400 === 0 → at the bottom
    scrollTo.mockClear();

    // `rerender` returns a thenable; awaiting it flushes the follow-along effect.
    await rerender(ui(two, "ready"));

    expect(scrollTo).toHaveBeenCalledWith({ top: 900, behavior: "auto" });
    expect(
      screen.queryByRole("button", { name: "Jump to latest message" }),
    ).not.toBeInTheDocument();
  });

  it("stops following once the reader scrolls up, and offers a way back", async () => {
    const user = userEvent.setup();
    const messages = [
      message("1", "user", "Hi"),
      message("2", "assistant", "Hello"),
    ];
    const { rerender } = render(ui(messages, "ready"));

    // 300px above the bottom — well past the slack.
    mockScrollMetrics(1200, 500);
    fireEvent.scroll(log());

    const jump = await screen.findByRole("button", {
      name: "Jump to latest message",
    });
    expect(jump).toHaveTextContent("Jump to latest");

    // New content must NOT drag the reader back down.
    scrollTo.mockClear();
    await rerender(ui([...messages, message("3", "assistant", "More")], "ready"));
    expect(scrollTo).not.toHaveBeenCalled();

    await user.click(jump);
    expect(scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: "smooth" });
    expect(
      screen.queryByRole("button", { name: "Jump to latest message" }),
    ).not.toBeInTheDocument();
  });

  it("counts the last few pixels as still being at the bottom", () => {
    render(
      ui(
        [message("1", "user", "Hi"), message("2", "assistant", "Hello")],
        "ready",
      ),
    );

    mockScrollMetrics(900, 900 - VIEWPORT - SLACK); // exactly on the boundary
    fireEvent.scroll(log());

    expect(
      screen.queryByRole("button", { name: "Jump to latest message" }),
    ).not.toBeInTheDocument();
  });

  it("does not offer the jump button on an empty conversation", () => {
    render(ui([], "ready"));

    mockScrollMetrics(1200, 100);
    fireEvent.scroll(log());

    expect(screen.getByText("Try one of these to get started:")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Jump to latest message" }),
    ).not.toBeInTheDocument();
  });
});
