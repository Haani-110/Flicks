import { AlertTriangle, Check, Loader2, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { movieSearchOutputSchema } from "@/lib/chat-contract";
import { cn } from "@/utils/cn";
import { getToolName, isToolUIPart, type ChatPart } from "./parts";

/** Human label per server tool. Unknown tools fall back to their own name. */
const TOOL_LABELS: Record<string, string> = {
  search_movies: "Catalog search",
};

type Filter = { label: string; value: string };

/**
 * Tool inputs are streamed incrementally, so every field is optional and may
 * still be partially written when this runs.
 */
export function filtersFromInput(input: unknown): Filter[] {
  if (!input || typeof input !== "object") return [];

  const { query, genre, maxRuntime } = input as Record<string, unknown>;
  const filters: Filter[] = [];

  if (typeof query === "string" && query.trim()) {
    filters.push({ label: "Keyword", value: query.trim() });
  }
  if (typeof genre === "string" && genre.trim()) {
    filters.push({ label: "Genre", value: genre.trim() });
  }
  if (typeof maxRuntime === "number" && Number.isFinite(maxRuntime)) {
    filters.push({ label: "Max runtime", value: `${maxRuntime} min` });
  }

  return filters;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Renders one tool invocation of the assistant, in every state the AI SDK can
 * report: streaming input, executing, finished (with or without matches),
 * failed, and awaiting approval.
 */
export function ToolCallCard({ part }: { part: ChatPart }) {
  if (!isToolUIPart(part)) return null;

  const toolName = getToolName(part);
  const label = TOOL_LABELS[toolName] ?? `Tool: ${toolName}`;

  const filters = filtersFromInput(
    "input" in part ? part.input : undefined,
  );

  return (
    <section
      aria-label={label}
      className="rounded-md border border-[#262b2f] bg-[#14181a]/70 p-3 text-xs"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-[#e8a73e]" aria-hidden="true" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa1a6]">
          {label}
        </h3>
        <ToolStateChip part={part} />
      </div>

      {filters.length > 0 && (
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {filters.map((filter) => (
            <div key={filter.label} className="flex items-baseline gap-1.5">
              <dt className="text-[11px] uppercase tracking-wide text-[#9aa1a6]">
                {filter.label}
              </dt>
              <dd className="font-medium text-[#f3f1ec]">{filter.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <ToolStateBody part={part} />
    </section>
  );
}

function ToolStateChip({ part }: { part: ChatPart }) {
  if (!isToolUIPart(part)) return null;

  const chip = cn(
    "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
    part.state === "output-error" && "bg-[#e05555]/15 text-[#e05555]",
    (part.state === "input-streaming" || part.state === "input-available") &&
      "bg-[#9aa1a6]/15 text-[#9aa1a6]",
    (part.state === "output-available" || part.state === "approval-responded") &&
      "bg-[#e8a73e]/15 text-[#e8a73e]",
    part.state === "output-denied" && "bg-[#e05555]/15 text-[#e05555]",
  );

  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <span className={chip}>
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        {part.state === "input-streaming" ? "Preparing" : "Searching"}
      </span>
    );
  }

  if (part.state === "output-available") {
    const parsed = movieSearchOutputSchema.safeParse(part.output);

    if (!parsed.success) {
      return <span className={chip}>Unreadable result</span>;
    }

    return (
      <span className={chip}>
        <Check className="h-3 w-3" aria-hidden="true" />
        {pluralize(parsed.data.count, "result")}
      </span>
    );
  }

  if (part.state === "output-denied") {
    return (
      <span className={chip}>
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        Denied
      </span>
    );
  }

  if (part.state === "output-error") {
    return (
      <span className={chip}>
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        Failed
      </span>
    );
  }

  if (part.state === "approval-requested") {
    return <span className={chip}>Needs approval</span>;
  }

  return <span className={chip}>Approved</span>;
}

function ToolStateBody({ part }: { part: ChatPart }) {
  if (!isToolUIPart(part)) return null;

  switch (part.state) {
    case "input-streaming":
      return (
        <p role="status" className="mt-2 text-[#9aa1a6]">
          Preparing the catalog search…
        </p>
      );

    case "input-available":
      return (
        <p role="status" className="mt-2 text-[#9aa1a6]">
          Searching the Flicks catalog…
        </p>
      );

    case "approval-requested":
      return (
        <p role="status" className="mt-2 text-[#9aa1a6]">
          Waiting for approval before searching.
        </p>
      );

    case "approval-responded":
      return <p className="mt-2 text-[#9aa1a6]">Approved. Searching…</p>;

    case "output-denied":
      return (
        <p role="alert" className="mt-2 font-medium text-[#e05555]">
          The search was denied, so no results were fetched.
        </p>
      );

    case "output-error":
      return (
        <p role="alert" className="mt-2 font-medium text-[#e05555]">
          {part.errorText || "The catalog search failed."}
        </p>
      );

    case "output-available": {
      const parsed = movieSearchOutputSchema.safeParse(part.output);

      if (!parsed.success) {
        return (
          <p role="alert" className="mt-2 font-medium text-[#e05555]">
            We couldn&apos;t read the search results.
          </p>
        );
      }

      const { movies } = parsed.data;

      if (movies.length === 0) {
        return (
          <div className="mt-2 space-y-1">
            <p className="font-medium text-[#f3f1ec]">No movies matched that search.</p>
            <p className="text-[#9aa1a6]">
              Try a different genre, a shorter keyword, or a longer runtime.
            </p>
          </div>
        );
      }

      return (
        <div className="mt-2 space-y-2">
          <p className="text-[#9aa1a6]">
            {pluralize(movies.length, "movie")} found
          </p>
          <ul aria-label="Search results" className="space-y-2">
            {movies.map((movie) => (
              <li key={movie.id}>
                <Link
                  to={`/movie/${movie.id}`}
                  className="font-medium text-[#f3f1ec] transition-colors hover:text-[#e8a73e]"
                >
                  {movie.title}
                </Link>
                <p className="text-[11px] text-[#9aa1a6]">
                  {movie.year} · {movie.rating.toFixed(1)}/10 · {movie.runtime} min
                  {movie.genres.length > 0 ? ` · ${movie.genres.join(", ")}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    default:
      // Unknown/future tool state: keep the chat readable instead of blank.
      return (
        <p role="status" className="mt-2 text-[#9aa1a6]">
          Working…
        </p>
      );
  }
}
