import { Link } from "react-router-dom";
import { movies } from "@/data/movies";
import { MovieCard } from "@/components/MovieCard";
import { useWatchlistContext } from "@/context/WatchlistContext";
import { ArrowRight, Film } from "lucide-react";

export function Home() {
  const { ids } = useWatchlistContext();

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-widest text-[#e8a73e]">
          Discover
        </p>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[#f3f1ec] sm:text-4xl lg:text-5xl">
          Find your next favorite film.
        </h1>
        <p className="max-w-2xl text-base text-[#9aa1a6] sm:text-lg">
          Browse popular movies, save titles you want to watch later, and keep
          your watchlist organized.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          {ids.length > 0 && (
            <Link to="/watchlist" className="btn btn-primary">
              Open Watchlist
              <span className="rounded-full bg-[#1a1a1a]/20 px-2 py-0.5 text-xs font-semibold">
                {ids.length}
              </span>
            </Link>
          )}
          <Link to="/health" className="btn btn-secondary">
            View Health Check
          </Link>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Film className="h-5 w-5 text-[#e8a73e]" />
            <h2 className="text-xl font-semibold text-[#f3f1ec] sm:text-2xl">
              Popular now
            </h2>
          </div>
          <Link
            to="/watchlist"
            className="flex items-center gap-1.5 text-sm font-medium text-[#9aa1a6] transition-colors hover:text-[#f3f1ec]"
          >
            Watchlist
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </section>
    </div>
  );
}
