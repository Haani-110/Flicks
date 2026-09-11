import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

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

type FlicksUIMessage = UIMessage;

export function Assistant() {
  const [input, setInput] = useState("");
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
  } = useChat<FlicksUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!userScrolledUp) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages, status, userScrolledUp]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;

    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    setUserScrolledUp(distanceFromBottom > 120);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const text = input.trim();

    if (!text || isBusy) return;

    setInput("");
    setUserScrolledUp(false);

    await sendMessage({
      text,
    });
  };

  const jumpToLatest = () => {
    setUserScrolledUp(false);

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Header */}
      <div className="border-b px-4 py-4">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-semibold">Flicks Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Ask about movies in the Flicks catalog.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="relative min-h-0 flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
          {messages.length === 0 && (
            <div className="rounded-2xl border bg-card p-6 text-center">
              <h2 className="mb-2 text-lg font-semibold">
                What are you watching?
              </h2>

              <p className="text-sm text-muted-foreground">
                Try asking:
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  "Find me some action movies",
                  "What are the best rated movies?",
                  "Find sci-fi movies under 150 minutes",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setInput(suggestion)}
                    className="rounded-full border px-4 py-2 text-sm transition hover:bg-muted"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="animate-pulse">●</span>
              Flicks Assistant is thinking…
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
              <p className="font-medium">Something went wrong.</p>
              <p className="mt-1 text-muted-foreground">
                {error.message || "The AI request failed. Please try again."}
              </p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {userScrolledUp && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="sticky bottom-4 left-1/2 -translate-x-1/2 rounded-full border bg-background px-4 py-2 text-sm shadow-md"
          >
            ↓ Jump to latest
          </button>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-background p-4">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-4xl gap-2"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={isBusy}
            placeholder="Ask Flicks Assistant…"
            className="min-w-0 flex-1 rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />

          {isBusy ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-xl border px-5 py-3 text-sm font-medium"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Message rendering                                                          */
/* -------------------------------------------------------------------------- */

function MessageBubble({
  message,
}: {
  message: FlicksUIMessage;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[85%] ${
          isUser
            ? "rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground"
            : "w-full max-w-3xl"
        }`}
      >
        <div className="space-y-3">
          {message.parts.map((part, index) => (
            <MessagePart
              key={`${message.id}-${index}`}
              part={part}
              isUser={isUser}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Typed message parts                                                        */
/* -------------------------------------------------------------------------- */

function MessagePart({
  part,
  isUser,
}: {
  part: FlicksUIMessage["parts"][number];
  isUser: boolean;
}) {
  /* Normal text */
  if (part.type === "text") {
    return (
      <div
        className={`whitespace-pre-wrap text-sm leading-6 ${
          isUser ? "" : "rounded-2xl border bg-card px-4 py-3"
        }`}
      >
        {part.text}
      </div>
    );
  }

  /*
   * Tool lifecycle.
   *
   * AI SDK tool parts are named:
   * tool-<toolName>
   *
   * Our tool is:
   * tool-search_movies
   */
  if (part.type === "tool-search_movies") {
    return <SearchMoviesToolPart part={part} />;
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* search_movies tool lifecycle UI                                            */
/* -------------------------------------------------------------------------- */

function SearchMoviesToolPart({
  part,
}: {
  part: Extract<
    FlicksUIMessage["parts"][number],
    { type: "tool-search_movies" }
  >;
}) {
  /*
   * STATE 1
   * input-streaming
   */
  if (part.state === "input-streaming") {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 animate-pulse rounded-full bg-muted-foreground" />

          <div>
            <p className="text-sm font-medium">
              Searching the Flicks catalog
            </p>

            <p className="text-xs text-muted-foreground">
              Receiving search parameters…
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
   * STATE 2
   * input-available
   */
  if (part.state === "input-available") {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 animate-pulse rounded-full bg-primary" />

          <div>
            <p className="text-sm font-medium">
              Searching the Flicks catalog
            </p>

            <p className="text-xs text-muted-foreground">
              Search parameters received. Running catalog search…
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Tool: <span className="font-mono">search_movies</span>
          </p>
        </div>
      </div>
    );
  }

  /*
   * STATE 3
   * output-error
   */
  if (part.state === "output-error") {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-destructive">⚠</div>

          <div>
            <p className="text-sm font-semibold">
              Movie search failed
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {part.errorText || "The movie catalog could not be searched."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
   * STATE 4
   * output-available
   *
   * This is the important part for the capstone:
   * the tool result is rendered as a real UI component,
   * NOT as raw JSON.
   */
  if (part.state === "output-available") {
    const output = part.output as SearchMoviesOutput;

    return <MovieSearchResults output={output} />;
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Real tool-result component                                                 */
/* -------------------------------------------------------------------------- */

function MovieSearchResults({
  output,
}: {
  output: SearchMoviesOutput;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            Movie search results
          </p>

          <p className="text-xs text-muted-foreground">
            {output.count}{" "}
            {output.count === 1 ? "movie" : "movies"} found
          </p>
        </div>

        <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
          ✓ Complete
        </div>
      </div>

      {output.count === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="text-sm font-medium">
            No matching movies
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Try another genre, keyword, or runtime.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {output.movies.map((movie) => (
            <MovieResultCard
              key={movie.id}
              movie={movie}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Movie result card                                                          */
/* -------------------------------------------------------------------------- */

function MovieResultCard({
  movie,
}: {
  movie: SearchMovie;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="flex gap-3 p-3">
        <img
          src={movie.posterPath}
          alt={movie.title}
          className="h-28 w-20 shrink-0 rounded-lg object-cover"
        />

        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">
            {movie.title}
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            {movie.year} • {movie.runtime} min
          </p>

          <div className="mt-2 flex items-center gap-1 text-xs">
            <span>★</span>
            <span className="font-medium">
              {movie.rating.toFixed(1)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {movie.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px]"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t px-3 py-2">
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
          {movie.overview}
        </p>
      </div>
    </div>
  );
}
