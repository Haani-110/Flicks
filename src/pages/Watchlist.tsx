import { Link } from "react-router-dom";
import { movies } from "@/data/movies";
import { MovieCard } from "@/components/MovieCard";
import { useWatchlistContext } from "@/context/WatchlistContext";
import { Bookmark, ArrowLeft, Sparkles } from "lucide-react";

/**
 * The saved list.
 *
 * `Watchlist` (h1), the `{n} movie|movies` count, the `No movies yet` empty
 * state and the `Browse movies` link are all asserted by the component test and
 * the primary end-to-end flow, so their names are untouched. The empty state
 * now also explains where the list is stored and offers the assistant as a
 * second way in, because "nothing here yet" should always say what to do next.
 */
export function Watchlist() {
  const { ids } = useWatchlistContext();
  const saved = movies.filter((m) => ids.includes(m.id));

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Your list</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[#f3f1ec] sm:text-3xl">
            Watchlist
          </h1>
          {saved.length > 0 && (
            <span className="chip chip-accent">
              {saved.length} {saved.length === 1 ? "movie" : "movies"}
            </span>
          )}
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-[#9aa1a6] sm:text-base">
          Movies you&apos;ve saved to watch later. Your watchlist is stored
          locally in your browser, so it survives a reload — and stays on this
          device.
        </p>
      </header>

      {saved.length === 0 ? (
        <div className="card relative overflow-hidden p-6 sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e8a73e]/45 to-transparent"
          />
          <div className="flex flex-col items-start gap-4 sm:items-center sm:text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border border-[#2f3639] bg-[#242a2e]"
              aria-hidden="true"
            >
              <Bookmark
                className="h-6 w-6 text-[#9aa1a6]"
                aria-hidden="true"
                focusable="false"
              />
            </div>

            <div className="space-y-2 sm:space-y-2">
              <h2 className="text-lg font-semibold text-[#f3f1ec]">
                No movies yet
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-[#9aa1a6]">
                Start discovering films and add them to your watchlist — the
                plus button on any poster saves it here.
              </p>
            </div>

            <div className="mt-1 flex flex-wrap gap-3 sm:justify-center">
              <Link to="/" className="btn btn-primary">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" focusable="false" />
                Browse movies
              </Link>
              <Link to="/assistant" className="btn btn-secondary">
                <Sparkles className="h-4 w-4 text-[#e8a73e]" aria-hidden="true" focusable="false" />
                Get a recommendation
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <section className="section" aria-labelledby="watchlist-grid-heading">
          <h2 id="watchlist-grid-heading" className="sr-only">
            Saved movies
          </h2>
          <div className="poster-grid">
            {saved.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
