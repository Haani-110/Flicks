import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { mockChatRoute, type RecordedChatRequest } from "@/test/mock-chat-route";
import {
  errorResponse,
  pendingResponse,
  streamResponse,
} from "@/test/ui-message-stream";
import {
  buildChatStreamChunks,
  CHAT_ANSWER,
  CHAT_QUESTION,
  SEARCH_MATCHES,
} from "@/test/fixtures/chat-stream";
import { Assistant } from "./Assistant";

/**
 * Page-level chat tests: pending, streaming, finished, failed and stopped.
 *
 * The AI route is mocked for every test (see src/test/mock-chat-route.ts), so
 * requests hit a stubbed fetch and never reach OpenRouter. Everything is
 * queried by role and accessible name.
 */

function renderAssistant() {
  return renderWithProviders(<Assistant />);
}

/** The chat card — the page also contains an unrelated button playground. */
const chat = () => screen.getByRole("region", { name: "Assistant chat" });
const composer = () =>
  within(chat()).getByRole("textbox", { name: "Ask about movies" });
const sendButton = () =>
  within(chat()).getByRole("button", { name: "Send message" });
const sendStatus = () =>
  within(chat()).getByRole("status", { name: "Sending status" });
const thinking = () =>
  within(chat()).queryByRole("status", { name: "Assistant is thinking" });
const assistantArticle = () =>
  within(chat()).getByRole("article", { name: "Assistant message" });
const userArticle = () =>
  within(chat()).getByRole("article", { name: "Your message" });

type SentMessage = { id: string; role: string; parts: { type: string; text?: string }[] };

/** The send button keeps its "Sent" confirmation for a moment after a reply. */
async function waitForSuccessFlashToClear() {
  await waitFor(
    () => expect(sendStatus()).not.toHaveTextContent("Message sent."),
    { timeout: 3000 },
  );
}

function sentMessages(request: RecordedChatRequest | undefined): SentMessage[] {
  return (request?.body?.messages ?? []) as SentMessage[];
}

describe("Assistant", () => {
  it("shows starter suggestions and posts the chosen one as UIMessage parts", async () => {
    const user = userEvent.setup();
    const { requests, fetchMock } = mockChatRoute(
      streamResponse(buildChatStreamChunks()),
    );

    renderAssistant();

    expect(
      within(chat()).getByRole("log", { name: "Conversation" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Which one is best rated?" }),
    );

    await waitFor(() => expect(requests).toHaveLength(1));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requests[0].url).toBe("/api/chat");
    expect(sentMessages(requests[0])).toEqual([
      {
        id: expect.any(String),
        role: "user",
        parts: [{ type: "text", text: "Which one is best rated?" }],
      },
    ]);
  });

  it("shows the pending state until the route answers", async () => {
    const user = userEvent.setup();
    mockChatRoute(pendingResponse());

    renderAssistant();

    await user.type(composer(), CHAT_QUESTION);
    await user.click(sendButton());

    // The reader's message shows immediately; the assistant is still thinking.
    expect(userArticle()).toHaveTextContent(CHAT_QUESTION);
    expect(thinking()).toBeInTheDocument();
    expect(sendStatus()).toHaveTextContent("Sending message…");

    expect(composer()).toBeDisabled();
    expect(composer()).toHaveAttribute("placeholder", "Waiting for response…");
    expect(
      within(chat()).getByRole("button", { name: "Stop generating" }),
    ).toBeInTheDocument();
    // Only the placeholder bubble exists so far, and it holds the thinking state.
    expect(
      within(assistantArticle()).getByRole("status", {
        name: "Assistant is thinking",
      }),
    ).toBeInTheDocument();
  });

  it("streams text and tool results into the transcript", async () => {
    const user = userEvent.setup();
    // holdOpen keeps the response in flight, so the streaming state is observable.
    mockChatRoute(
      streamResponse(buildChatStreamChunks(), { chunkDelayMs: 5, holdOpen: true }),
    );

    renderAssistant();

    await user.type(composer(), CHAT_QUESTION);
    await user.click(sendButton());

    const toolCard = await within(chat()).findByRole("region", {
      name: "Catalog search",
    });
    const results = within(toolCard).getByRole("list", { name: "Search results" });

    for (const movie of SEARCH_MATCHES) {
      expect(
        within(results).getByRole("link", { name: movie.title }),
      ).toHaveAttribute("href", `/movie/${movie.id}`);
    }

    await waitFor(() =>
      expect(assistantArticle()).toHaveTextContent(
        new RegExp(`I found ${SEARCH_MATCHES.length} sci-fi titles`),
      ),
    );

    expect(assistantArticle()).toHaveAttribute("aria-busy", "true");
    expect(assistantArticle()).toHaveTextContent(CHAT_ANSWER);
    expect(thinking()).not.toBeInTheDocument();
    expect(
      within(chat()).getByRole("button", { name: "Stop generating" }),
    ).toBeInTheDocument();
    expect(sendStatus()).not.toHaveTextContent("Message sent.");
  });

  it("confirms a finished response and unlocks the composer", async () => {
    const user = userEvent.setup();
    mockChatRoute(streamResponse(buildChatStreamChunks()));

    renderAssistant();

    await user.type(composer(), CHAT_QUESTION);
    await user.click(sendButton());

    await waitFor(() => expect(sendStatus()).toHaveTextContent("Message sent."));

    expect(assistantArticle()).not.toHaveAttribute("aria-busy");
    expect(assistantArticle()).toHaveTextContent(CHAT_ANSWER);
    expect(composer()).toBeEnabled();
    expect(
      within(chat()).queryByRole("button", { name: "Stop generating" }),
    ).not.toBeInTheDocument();
  });

  it("sends the whole conversation back, tool parts included", async () => {
    const user = userEvent.setup();
    const { requests } = mockChatRoute(streamResponse(buildChatStreamChunks()));

    renderAssistant();

    await user.type(composer(), CHAT_QUESTION);
    await user.click(sendButton());
    await waitFor(() => expect(sendStatus()).toHaveTextContent("Message sent."));
    await waitForSuccessFlashToClear();

    await user.type(composer(), "And which one is longest?");
    await user.click(sendButton());
    await waitFor(() => expect(requests).toHaveLength(2));
    await waitFor(() => expect(sendStatus()).toHaveTextContent("Message sent."));

    const second = sentMessages(requests[1]);
    expect(second.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "user",
    ]);
    expect(
      second[1].parts.some((part) => part.type === "tool-search_movies"),
    ).toBe(true);
    expect(second[2].parts).toEqual([
      { type: "text", text: "And which one is longest?" },
    ]);
  });

  it("surfaces a failed request and retries it without duplicating the question", async () => {
    const user = userEvent.setup();
    const { requests } = mockChatRoute([
      errorResponse(500, "AI is not configured."),
      streamResponse(buildChatStreamChunks()),
    ]);

    renderAssistant();

    await user.type(composer(), CHAT_QUESTION);
    await user.click(sendButton());

    // The route's JSON error body is shown as a sentence, not raw JSON.
    const alert = await within(chat()).findByRole("alert");
    expect(alert).toHaveTextContent("AI is not configured.");
    expect(sendStatus()).toHaveTextContent(
      "Send failed. Press Retry to try again.",
    );

    await user.click(
      within(chat()).getByRole("button", {
        name: "Send failed. Activate to retry.",
      }),
    );

    await waitFor(() => expect(requests).toHaveLength(2));

    const retry = sentMessages(requests[1]);
    expect(retry).toHaveLength(1);
    expect(retry[0].parts).toEqual([{ type: "text", text: CHAT_QUESTION }]);

    // Retrying replaces the failed turn: one question, one answer.
    await waitFor(() =>
      expect(within(chat()).queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(
      within(chat()).getAllByRole("article", { name: "Your message" }),
    ).toHaveLength(1);
    await waitFor(() => expect(assistantArticle()).toHaveTextContent(CHAT_ANSWER));
  });

  it("reports an error that arrives inside the stream", async () => {
    const user = userEvent.setup();
    mockChatRoute(
      streamResponse([
        { type: "start", messageId: "assistant-error-1" },
        { type: "error", errorText: "The model is overloaded right now." },
      ]),
    );

    renderAssistant();

    await user.type(composer(), CHAT_QUESTION);
    await user.click(sendButton());

    expect(await within(chat()).findByRole("alert")).toHaveTextContent(
      "The model is overloaded right now.",
    );
    expect(sendStatus()).toHaveTextContent(
      "Send failed. Press Retry to try again.",
    );
  });

  it("keeps the partial answer when the reader stops the stream", async () => {
    const user = userEvent.setup();
    mockChatRoute(
      streamResponse(buildChatStreamChunks(), { chunkDelayMs: 5, holdOpen: true }),
    );

    renderAssistant();

    await user.type(composer(), CHAT_QUESTION);
    await user.click(sendButton());

    await waitFor(() => expect(assistantArticle()).toHaveTextContent(/I found/));

    await user.click(
      within(chat()).getByRole("button", { name: "Stop generating" }),
    );

    await waitFor(() => expect(sendButton()).toBeEnabled());

    expect(within(chat()).queryByRole("alert")).not.toBeInTheDocument();
    expect(assistantArticle()).toHaveTextContent(/I found/);
    expect(sendStatus()).not.toHaveTextContent("Message sent.");
    expect(thinking()).not.toBeInTheDocument();
  });

  it("warns about an over-long message instead of sending it", async () => {
    const user = userEvent.setup();
    const { requests } = mockChatRoute(streamResponse(buildChatStreamChunks()));

    renderAssistant();

    await user.click(composer());
    await user.paste("x".repeat(2001));
    await user.click(sendButton());

    expect(within(chat()).getByRole("alert")).toHaveTextContent(
      "Messages must be 2000 characters or fewer.",
    );
    expect(requests).toHaveLength(0);
    expect(sendStatus()).not.toHaveTextContent("Sending message…");
  });
});
