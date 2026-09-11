import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ArrowDown,
  Bot,
  CheckCircle2,
  Clock,
  Search,
  Send,
  Square,
  Star,
  XCircle,
} from "lucide-react";
import type { UIMessage } from "ai";

type SearchMovie = {
  id: number;
  title: string;
  year: number;
  rating: number;
  posterPath: string;
  genres: string[];
  overview: string;
  runtime: number;
};

type SearchMoviesOutput = {
  query: string | null;
  genre: string | null;
  maxRuntime: number | null;
  count: number;
  movies: SearchMovie[];
};

type SearchMoviesToolPart = {
  type: "tool-search_movies";
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: {
    query?: string;
    genre?: string;
    maxRuntime?: number;
  };
  output?: SearchMoviesOutput;
  errorText?: string;
};

type FlicksMessage = UIMessage;

function isSearchMoviesToolPart(
  part: unknown,
): part is SearchMoviesToolPart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part as { type?: unknown }).type ===
      "tool-search_movies"
  );
}

function MovieSearchResults({
  result,
}: {
  result: SearchMoviesOutput;
}) {
  if (result.count === 0) {
    return (
      <div className="card mt-3 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[#f3f1ec]">
          <Search className="h-4 w-4 text-[#e8a73e]" />
          No movies found
        </div>

        <p className="mt-1 text-xs text-[#9aa1a6]">
          Try a broader keyword, another genre, or a shorter runtime.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("flicks:assistant-suggestion", { detail: "Find me some sci-fi movies" }))} className="btn btn-secondary text-xs">
            Try sci-fi
          </button>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("flicks:assistant-suggestion", { detail: "Find movies under 150 minutes" }))} className="btn btn-secondary text-xs">
            Under 150 min
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#e8a73e]" />

          <span className="text-sm font-medium text-[#f3f1ec]">
            {result.count}{" "}
            {result.count === 1 ? "movie" : "movies"} found
          </span>
        </div>

        {result.maxRuntime && (
          <span className="text-xs text-[#9aa1a6]">
            ≤ {result.maxRuntime} min
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {result.movies.map((movie) => (
          <article
            key={movie.id}
            className="overflow-hidden rounded-lg border border-[#262b2f] bg-[#1d2124] transition-colors hover:border-[#3a4146]"
          >
            <div className="flex gap-3 p-3">
              <div className="h-28 w-[74px] shrink-0 overflow-hidden rounded-md bg-[#242a2e]">
                <img
                  src={movie.posterPath}
                  alt={`${movie.title} poster`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium text-[#f3f1ec]">
                  {movie.title}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#9aa1a6]">
                  <span>{movie.year}</span>

                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-[#e8a73e] text-[#e8a73e]" />
                    {movie.rating.toFixed(1)}
                  </span>

                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {movie.runtime} min
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {movie.genres.slice(0, 3).map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full bg-[#242a2e] px-2 py-0.5 text-[10px] text-[#9aa1a6]"
                    >
                      {genre}
                    </span>
                  ))}
                </div>

                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#9aa1a6]">
                  {movie.overview}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ToolPart({
  part,
}: {
  part: SearchMoviesToolPart;
}) {
  if (part.state === "input-streaming") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#262b2f] bg-[#14181a] px-3 py-2.5 text-xs text-[#9aa1a6]">
        <Search className="h-3.5 w-3.5 animate-pulse text-[#e8a73e]" />
        <span>Preparing Flicks catalog search…</span>
      </div>
    );
  }

  if (part.state === "input-available") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#262b2f] bg-[#14181a] px-3 py-2.5 text-xs text-[#9aa1a6]">
        <Search className="h-3.5 w-3.5 animate-pulse text-[#e8a73e]" />
        <span>Searching the Flicks catalog…</span>
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#e05555]/40 bg-[#e05555]/10 px-3 py-3">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#e05555]" />

        <div>
          <p className="text-xs font-medium text-[#f3f1ec]">
            Catalog search failed
          </p>

          <p className="mt-1 text-xs text-[#9aa1a6]">
            {part.errorText ||
              "The movie search could not be completed."}
          </p>
        </div>
      </div>
    );
  }

  if (
    part.state === "output-available" &&
    part.output
  ) {
    return <MovieSearchResults result={part.output} />;
  }

  return null;
}

export function Assistant() {
  const [input, setInput] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement | null>(
    null,
  );

  const atBottomRef = useRef(true);

  const {
    messages,
    sendMessage,
    regenerate,
    status,
    stop,
    error,
  } = useChat<FlicksMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const busy =
    status === "submitted" ||
    status === "streaming";

  const scrollToBottom = (smooth = false) => {
    const element = scrollRef.current;

    if (!element) return;

    element.scrollTo({
      top: element.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  const handleScroll = () => {
    const element = scrollRef.current;

    if (!element) return;

    const atBottom =
      element.scrollHeight -
        element.scrollTop -
        element.clientHeight <=
      80;

    atBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  };

  const jumpToLatest = () => {
    atBottomRef.current = true;
    setIsAtBottom(true);
    scrollToBottom(true);
  };

  useEffect(() => {
    if (atBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, status]);

  useEffect(() => {
    const handleSuggestion = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      void send(customEvent.detail);
    };
    window.addEventListener("flicks:assistant-suggestion", handleSuggestion);
    return () => window.removeEventListener("flicks:assistant-suggestion", handleSuggestion);
  });

  const send = async (text?: string) => {
    const value = (text ?? input).trim();

    if (!value || busy) return;

    setInput("");

    await sendMessage({
      text: value,
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };

  const onKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-[#e8a73e]">
          AI
        </p>

        <h1 className="text-2xl font-semibold tracking-tight text-[#f3f1ec] sm:text-3xl">
          Assistant
        </h1>

        <p className="max-w-xl text-sm text-[#9aa1a6] sm:text-base">
          Ask about the Flicks catalog. I can search
          and recommend movies for you.
        </p>
      </header>

      <div className="card flex flex-col overflow-hidden">
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            role="log"
            aria-label="Conversation"
            className="h-[58vh] min-h-[360px] space-y-5 overflow-y-auto p-4 sm:p-6"
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#242a2e]">
                  <Bot className="h-7 w-7 text-[#e8a73e]" />
                </div>

                <div>
                  <h2 className="text-base font-medium text-[#f3f1ec]">
                    Welcome to Flicks Assistant
                  </h2>

                  <p className="mt-1 text-sm text-[#9aa1a6]">
                    Try one of these:
                  </p>
                </div>

                <div className="flex max-w-xl flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void send(
                        "What movies are available?",
                      )
                    }
                    className="btn btn-secondary text-xs"
                  >
                    What movies are available?
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void send(
                        "Find me some sci-fi movies",
                      )
                    }
                    className="btn btn-secondary text-xs"
                  >
                    Find me some sci-fi movies
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void send(
                        "Find movies under 150 minutes",
                      )
                    }
                    className="btn btn-secondary text-xs"
                  >
                    Find movies under 150 minutes
                  </button>
                </div>
              </div>
            )}

            {messages.map((message) => {
              const isUser =
                message.role === "user";

              return (
                <div
                  key={message.id}
                  className={
                    isUser
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <div
                    className={
                      isUser
                        ? "max-w-[88%] rounded-lg bg-[#e8a73e] px-4 py-3 text-sm leading-relaxed text-[#1a1a1a]"
                        : "w-full max-w-[94%] rounded-lg bg-[#242a2e] px-4 py-3 text-sm leading-relaxed text-[#f3f1ec]"
                    }
                  >
                    {message.parts.map(
                      (part, index) => {
                        if (part.type === "text") {
                          return (
                            <p
                              key={`${message.id}-text-${index}`}
                              className="whitespace-pre-wrap break-words"
                            >
                              {part.text}
                            </p>
                          );
                        }

                        if (
                          !isUser &&
                          isSearchMoviesToolPart(
                            part,
                          )
                        ) {
                          return (
                            <ToolPart
                              key={`${message.id}-tool-${index}`}
                              part={part}
                            />
                          );
                        }

                        return null;
                      },
                    )}

                    {!isUser &&
                      message.parts.length === 0 &&
                      status === "submitted" && (
                        <span
                          className="flex items-center gap-1.5"
                          role="status"
                        >
                          <span className="h-2 w-2 animate-bounce rounded-full bg-[#9aa1a6]" />

                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-[#9aa1a6]"
                            style={{
                              animationDelay: "150ms",
                            }}
                          />

                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-[#9aa1a6]"
                            style={{
                              animationDelay: "300ms",
                            }}
                          />
                        </span>
                      )}
                  </div>
                </div>
              );
            })}

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-[#e05555]/40 bg-[#e05555]/10 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#e05555]" />
                    <div className="min-w-0">
                      <span className="font-medium text-[#f3f1ec]">
                        We couldn't complete that request
                      </span>
                      <p className="mt-1 text-xs text-[#9aa1a6]">
                        {error.message ||
                          "The connection was interrupted. Please try again."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void regenerate()}
                    disabled={busy}
                    className="btn btn-secondary shrink-0 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isAtBottom &&
            messages.length > 0 && (
              <button
                type="button"
                onClick={jumpToLatest}
                className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#14181a] px-3 py-1.5 text-xs font-medium text-[#f3f1ec] shadow-lg ring-1 ring-[#262b2f] transition-colors hover:bg-[#242a2e]"
              >
                <ArrowDown className="h-3.5 w-3.5" />
                Jump to latest
              </button>
            )}
        </div>

        <div className="border-t border-[#262b2f] p-3 sm:p-4">
          <form
            onSubmit={onSubmit}
            className="flex items-end gap-2"
          >
            <label
              htmlFor="assistant-input"
              className="sr-only"
            >
              Ask about movies
            </label>

            <textarea
              id="assistant-input"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={onKeyDown}
              rows={2}
              disabled={busy}
              placeholder={
                busy
                  ? "Searching the catalog…"
                  : "Ask about movies…"
              }
              className="min-w-0 flex-1 resize-none rounded-md bg-[#101315] px-3 py-2 text-sm text-[#f3f1ec] ring-1 ring-[#262b2f] placeholder:text-[#9aa1a6]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] disabled:opacity-60"
            />

            {busy ? (
              <button
                type="button"
                onClick={() => stop()}
                aria-label="Stop generating"
                className="btn shrink-0 bg-[#e05555] text-white hover:bg-[#c94a4a]"
              >
                <Square className="h-4 w-4" />

                <span className="hidden sm:inline">
                  Stop
                </span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="btn btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />

                <span className="hidden sm:inline">
                  Send
                </span>
              </button>
            )}
          </form>

          <p className="mt-2 text-xs text-[#9aa1a6]">
            Enter to send, Shift+Enter for a new line.
          </p>
        </div>
      </div>
    </div>
  );
}
