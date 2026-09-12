import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import type { UIMessage } from "ai";
import { renderWithProviders } from "@/test/render";
import { SEARCH_OUTPUT } from "@/test/fixtures/chat-stream";
import { ChatMessage } from "./ChatMessage";
import type { ChatPart } from "./parts";

/**
 * Tests for the chat message renderer.
 *
 * Everything is asserted through roles, accessible names and text — never CSS
 * classes or test ids — so restyling the chat cannot break this suite.
 */

function userMessage(text: string): UIMessage {
  return {
    id: "user-1",
    role: "user",
    parts: [{ type: "text", text }],
  };
}

function assistantMessage(parts: ChatPart[]): UIMessage {
  return { id: "assistant-1", role: "assistant", parts };
}

const assistantArticle = () =>
  screen.getByRole("article", { name: "Assistant message" });

describe("ChatMessage", () => {
  it("renders a user message as an addressable article with its text", () => {
    renderWithProviders(
      <ChatMessage message={userMessage("Which movies are best rated?")} />,
    );

    const article = screen.getByRole("article", { name: "Your message" });
    expect(article).toHaveTextContent("Which movies are best rated?");
    expect(
      screen.queryByRole("article", { name: "Assistant message" }),
    ).not.toBeInTheDocument();
  });

  it("renders multi-part assistant text without collapsing line breaks", () => {
    renderWithProviders(
      <ChatMessage
        message={assistantMessage([
          { type: "text", text: "Here are two picks:" },
          { type: "text", text: "Dune: Part Two\nOppenheimer" },
        ])}
      />,
    );

    const article = assistantArticle();
    expect(article).toHaveTextContent("Here are two picks:");
    expect(article.textContent).toContain("Dune: Part Two\nOppenheimer");
  });

  it("announces the thinking state while the request is pending", () => {
    renderWithProviders(
      <ChatMessage message={assistantMessage([])} pending />,
    );

    expect(
      screen.getByRole("status", { name: "Assistant is thinking" }),
    ).toBeInTheDocument();
    expect(assistantArticle()).not.toHaveTextContent("No response was generated");
  });

  it("marks the message as busy while text is streaming and clears it after", () => {
    const message = assistantMessage([{ type: "text", text: "Dune is" }]);

    const { rerender } = renderWithProviders(
      <ChatMessage message={message} streaming />,
    );

    expect(assistantArticle()).toHaveAttribute("aria-busy", "true");
    expect(
      screen.queryByRole("status", { name: "Assistant is thinking" }),
    ).not.toBeInTheDocument();

    rerender(<ChatMessage message={message} />);

    expect(assistantArticle()).not.toHaveAttribute("aria-busy");
  });

  it("shows the streamed tool card next to the streamed text", () => {
    renderWithProviders(
      <ChatMessage
        streaming
        message={assistantMessage([
          {
            type: "tool-search_movies",
            toolCallId: "call-1",
            state: "output-available",
            input: { genre: "Sci-Fi" },
            output: SEARCH_OUTPUT,
          },
          { type: "text", text: "Two good ones:" },
        ])}
      />,
    );

    const card = screen.getByRole("region", { name: "Catalog search" });
    expect(
      within(card).getByRole("list", { name: "Search results" }),
    ).toBeInTheDocument();
    expect(assistantArticle()).toHaveTextContent("Two good ones:");
  });

  it("renders a reasoning part while the assistant is still thinking", () => {
    renderWithProviders(
      <ChatMessage
        pending
        message={assistantMessage([
          { type: "reasoning", text: "Checking runtimes against the catalog." },
        ])}
      />,
    );

    const reasoning = screen.getByRole("region", { name: "Model reasoning" });
    expect(reasoning).toHaveTextContent(
      "Checking runtimes against the catalog.",
    );
    expect(
      screen.getByRole("status", { name: "Assistant is thinking" }),
    ).toBeInTheDocument();
  });

  it("renders a file part as a link named after the file", () => {
    renderWithProviders(
      <ChatMessage
        message={assistantMessage([
          {
            type: "file",
            mediaType: "image/png",
            filename: "watchlist-summary.png",
            url: "https://example.com/watchlist-summary.png",
          },
        ])}
      />,
    );

    expect(
      screen.getByRole("link", { name: "watchlist-summary.png" }),
    ).toHaveAttribute("href", "https://example.com/watchlist-summary.png");
  });

  it("lists sources from url and document parts", () => {
    renderWithProviders(
      <ChatMessage
        message={assistantMessage([
          { type: "text", text: "As listed in the catalog." },
          {
            type: "source-url",
            sourceId: "s1",
            url: "https://www.themoviedb.org/movie/693134",
            title: "Dune: Part Two on TMDB",
          },
          {
            type: "source-document",
            sourceId: "s2",
            mediaType: "application/pdf",
            title: "Flicks catalog sheet",
            filename: "catalog.pdf",
          },
        ])}
      />,
    );

    const sources = screen.getByRole("list", { name: "Sources" });
    expect(sources).toHaveTextContent("Dune: Part Two on TMDB");
    expect(sources).toHaveTextContent("Flicks catalog sheet (catalog.pdf)");
    expect(
      within(sources).getByRole("link", { name: "Dune: Part Two on TMDB" }),
    ).toHaveAttribute("href", "https://www.themoviedb.org/movie/693134");
  });

  it("separates assistant steps with a labelled divider", () => {
    renderWithProviders(
      <ChatMessage
        message={assistantMessage([
          { type: "text", text: "Searching first." },
          { type: "step-start" },
          { type: "text", text: "Then answering." },
        ])}
      />,
    );

    expect(
      screen.getByRole("separator", { name: "Assistant step" }),
    ).toBeInTheDocument();
  });

  it("renders a data part's message and ignores parts it does not know", () => {
    renderWithProviders(
      <ChatMessage
        message={assistantMessage([
          { type: "data-catalog-note", data: { message: "Catalog refreshed." } } as ChatPart,
          { type: "future-part-type", payload: "unknown" } as unknown as ChatPart,
        ])}
      />,
    );

    expect(screen.getByText("Catalog refreshed.")).toBeInTheDocument();
    expect(assistantArticle()).toHaveTextContent("Catalog refreshed.");
  });

  it("tells the reader when a finished response had no content", () => {
    renderWithProviders(<ChatMessage message={assistantMessage([])} />);

    expect(assistantArticle()).toHaveTextContent("No response was generated.");
    expect(
      screen.queryByRole("status", { name: "Assistant is thinking" }),
    ).not.toBeInTheDocument();
  });
});
