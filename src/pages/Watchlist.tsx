import { Link } from "react-router-dom";
import { movies } from "@/data/movies";
import { MovieCard } from "@/components/MovieCard";
import { useWatchlistContext } from "@/context/WatchlistContext";
import { Bookmark, ArrowLeft } from "lucide-react";

export function Watchlist() {
  const { ids } = useWatchlistContext();
  const saved = movies.filter((m) => ids.includes(m.id));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-[#e8a73e]">
          Your list
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[#f3f1ec] sm:text-3xl">
            Watchlist
          </h1>
          {saved.length > 0 && (
            <span className="rounded-full bg-[#e8a73e]/20 px-2.5 py-1 text-sm font-medium text-[#e8a73e]">
              {saved.length} {saved.length === 1 ? "movie" : "movies"}
            </span>
          )}
        </div>
        <p className="max-w-xl text-sm text-[#9aa1a6] sm:text-base">
          Movies you've saved to watch later. Your watchlist is stored locally
          in your browser.
        </p>
      </header>

      {saved.length === 0 ? (
        <div className="card flex flex-col items-start gap-3 p-6 sm:items-center sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#242a2e]" aria-hidden="true">
            <Bookmark className="h-6 w-6 text-[#9aa1a6]" aria-hidden="true" focusable="false" />
          </div>
          <h2 className="text-lg font-medium text-[#f3f1ec]">No movies yet</h2>
          <p className="text-center text-sm text-[#9aa1a6]">
            Start discovering films and add them to your watchlist.
          </p>
          <Link to="/" className="btn btn-primary mt-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" focusable="false" />
            Browse movies
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {saved.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}
