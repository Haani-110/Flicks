import { Link } from "react-router-dom";
import { movies } from "@/data/movies";
import { MovieCard } from "@/components/MovieCard";
import { useWatchlistContext } from "@/context/WatchlistContext";
import { ArrowRight, Film } from "lucide-react";
import { ShaderHero } from "@/components/ShaderHero";

export function Home() {
  const { ids } = useWatchlistContext();

  return (
    <div className="space-y-12">
      <ShaderHero>
        <section className="space-y-4" aria-labelledby="home-hero-heading">
          <p className="text-sm font-medium uppercase tracking-widest text-[#e8a73e] drop-shadow-[0_1px_12px_rgba(232,167,62,0.55)]">
            Discover
          </p>
          <h1
            id="home-hero-heading"
            className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#f3f1ec] sm:text-4xl lg:text-5xl [text-shadow:0_2px_20px_rgba(0,0,0,0.55)]"
          >
            Find your next favorite film.
          </h1>
          <p className="max-w-2xl text-base text-[#d8dde0] sm:text-lg [text-shadow:0_1px_14px_rgba(0,0,0,0.6)]">
            Browse popular movies, save titles you want to watch later, and keep
            your watchlist organized. The aurora behind you is a live shader —
            move your pointer to lean the light, it rests when you do.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {ids.length > 0 && (
              <Link to="/watchlist" className="btn btn-primary shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
                Open Watchlist
                <span
                  className="rounded-full bg-[#1a1a1a]/20 px-2 py-0.5 text-xs font-semibold"
                  aria-hidden="true"
                >
                  {ids.length}
                </span>
              </Link>
            )}
            <Link
              to="/health"
              className="btn btn-secondary backdrop-blur-sm bg-[#1d2124]/80 shadow-[0_6px_20px_rgba(0,0,0,0.25)]"
            >
              View Health Check
            </Link>
          </div>
          <p className="pt-2 text-xs text-[#c9cbd1]/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
            Motion respects <code className="rounded bg-black/30 px-1 py-0.5">prefers-reduced-motion</code> — reduced-motion shows the same palette as a still gradient.
          </p>
        </section>
      </ShaderHero>

      <section className="space-y-5" aria-labelledby="popular-heading">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Film className="h-5 w-5 text-[#e8a73e]" aria-hidden="true" focusable="false" />
            <h2 id="popular-heading" className="text-xl font-semibold text-[#f3f1ec] sm:text-2xl">
              Popular now
            </h2>
          </div>
          <Link
            to="/watchlist"
            className="flex items-center gap-1.5 text-sm font-medium text-[#9aa1a6] transition-colors hover:text-[#f3f1ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101315] rounded-sm"
          >
            Watchlist
            <ArrowRight className="h-4 w-4" aria-hidden="true" focusable="false" />
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
