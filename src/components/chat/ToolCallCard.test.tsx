import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { SEARCH_MATCHES, SEARCH_OUTPUT, TOOL_CALL_ID } from "@/test/fixtures/chat-stream";
import { ToolCallCard, filtersFromInput } from "./ToolCallCard";
import type { ChatPart } from "./parts";

/** Tests for the tool-result component, one per tool state the SDK reports. */

function searchPart(state: string, extra: Record<string, unknown> = {}): ChatPart {
  return {
    type: "tool-search_movies",
    toolCallId: TOOL_CALL_ID,
    state,
    ...extra,
  } as unknown as ChatPart;
}

const card = () => screen.getByRole("region", { name: "Catalog search" });

describe("ToolCallCard", () => {
  it("shows a preparing status while the tool input is still streaming", () => {
    renderWithProviders(<ToolCallCard part={searchPart("input-streaming", { input: {} })} />);

    expect(
      within(card()).getByRole("status"),
    ).toHaveTextContent("Preparing the catalog search…");
  });

  it("shows the executing status and the filters it was called with", () => {
    renderWithProviders(
      <ToolCallCard
        part={searchPart("input-available", {
          input: { genre: "Sci-Fi", maxRuntime: 170 },
        })}
      />,
    );

    const region = card();
    expect(within(region).getByRole("status")).toHaveTextContent(
      "Searching the Flicks catalog…",
    );
    expect(within(region).getByText("Sci-Fi")).toBeInTheDocument();
    expect(within(region).getByText("170 min")).toBeInTheDocument();
  });

  it("renders results with a link per match once the tool output arrives", () => {
    renderWithProviders(
      <ToolCallCard
        part={searchPart("output-available", {
          input: { genre: "Sci-Fi" },
          output: SEARCH_OUTPUT,
        })}
      />,
    );

    const results = within(card()).getByRole("list", { name: "Search results" });
    expect(within(card()).getByText(`${SEARCH_MATCHES.length} movies found`)).toBeInTheDocument();

    for (const movie of SEARCH_MATCHES) {
      expect(
        within(results).getByRole("link", { name: movie.title }),
      ).toHaveAttribute("href", `/movie/${movie.id}`);
    }

    expect(within(card()).getByText(`${SEARCH_MATCHES.length} results`)).toBeInTheDocument();
  });

  it("explains an empty result set instead of showing an empty list", () => {
    renderWithProviders(
      <ToolCallCard
        part={searchPart("output-available", {
          input: { genre: "Western" },
          output: { ...SEARCH_OUTPUT, count: 0, movies: [] },
        })}
      />,
    );

    expect(card()).toHaveTextContent("No movies matched that search.");
    expect(screen.queryByRole("list", { name: "Search results" })).not.toBeInTheDocument();
  });

  it("surfaces a tool failure as an alert", () => {
    renderWithProviders(
      <ToolCallCard
        part={searchPart("output-error", {
          input: { genre: "Sci-Fi" },
          errorText: "Catalog is unavailable right now.",
        })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Catalog is unavailable right now.",
    );
  });

  it("degrades gracefully when the tool output does not match the schema", () => {
    renderWithProviders(
      <ToolCallCard
        part={searchPart("output-available", {
          input: { genre: "Sci-Fi" },
          output: { unexpected: "shape" },
        })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't read the search results.",
    );
  });

  it("labels an unknown tool with its own name", () => {
    renderWithProviders(
      <ToolCallCard
        part={
          {
            type: "dynamic-tool",
            toolName: "lookup_showtimes",
            toolCallId: "call-2",
            state: "output-available",
            input: { city: "Berlin" },
            output: { showtimes: 3 },
          } as unknown as ChatPart
        }
      />,
    );

    expect(
      screen.getByRole("region", { name: "Tool: lookup_showtimes" }),
    ).toBeInTheDocument();
  });

  it("waits for approval instead of running the tool", () => {
    renderWithProviders(
      <ToolCallCard
        part={searchPart("approval-requested", {
          input: { genre: "Sci-Fi" },
          approval: { id: "approval-1" },
        })}
      />,
    );

    expect(card()).toHaveTextContent("Waiting for approval before searching.");
  });

  it("reports a denied tool call as an alert", () => {
    renderWithProviders(
      <ToolCallCard
        part={searchPart("output-denied", { input: { genre: "Sci-Fi" } })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The search was denied, so no results were fetched.",
    );
  });

  it("ignores partial filters while the input is still streaming", () => {
    expect(filtersFromInput({ genre: 42, maxRuntime: "soon" })).toEqual([]);
    expect(filtersFromInput(undefined)).toEqual([]);
    expect(filtersFromInput({ query: "  dune  " })).toEqual([
      { label: "Keyword", value: "dune" },
    ]);
  });
});
