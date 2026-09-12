import { Link } from "react-router-dom";
import { movies } from "@/data/movies";
import { MovieCard } from "@/components/MovieCard";
import { useWatchlistContext } from "@/context/WatchlistContext";
import { ArrowRight, Film } from "lucide-react";
import { ShaderHero } from "@/components/ShaderHero";

/**
 * The landing page: the aurora hero, then the whole catalog.
 *
 * Every heading id, link name and the hero copy are preserved — the
 * end-to-end primary flow starts from `Find your next favorite film.` and the
 * component test asserts one link per catalog title plus the conditional
 * `Open Watchlist` call to action.
 */
export function Home() {
  const { ids } = useWatchlistContext();

  return (
    <div className="space-y-12 sm:space-y-16">
      <ShaderHero>
        <section className="space-y-4" aria-labelledby="home-hero-heading">
          <p className="eyebrow drop-shadow-[0_1px_12px_rgba(232,167,62,0.55)]">
            Discover
          </p>
          <h1
            id="home-hero-heading"
            className="max-w-3xl text-3xl font-semibold leading-[1.1] tracking-tight text-[#f3f1ec] sm:text-4xl lg:text-5xl [text-shadow:0_2px_20px_rgba(0,0,0,0.55)]"
          >
            Find your next favorite film.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-[#d8dde0] sm:text-lg [text-shadow:0_1px_14px_rgba(0,0,0,0.6)]">
            Browse popular movies, save titles you want to watch later, and keep
            your watchlist organized. The aurora behind you is a live shader —
            move your pointer to lean the light, it rests when you do.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {ids.length > 0 && (
              <Link
                to="/watchlist"
                className="btn btn-primary shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
              >
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
            Motion respects{" "}
            <code className="rounded bg-black/30 px-1 py-0.5 font-mono">
              prefers-reduced-motion
            </code>{" "}
            — reduced-motion shows the same palette as a still gradient.
          </p>
        </section>
      </ShaderHero>

      <section className="section" aria-labelledby="popular-heading">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#262b2f] bg-[#14181a]"
            >
              <Film className="h-4 w-4 text-[#e8a73e]" aria-hidden="true" focusable="false" />
            </span>
            <div>
              <h2
                id="popular-heading"
                className="text-xl font-semibold tracking-tight text-[#f3f1ec] sm:text-2xl"
              >
                Popular now
              </h2>
              <p className="mt-1 text-sm text-[#9aa1a6]">
                {movies.length} films in the Flicks shelf, rated and ready.
              </p>
            </div>
          </div>

          <Link
            to="/watchlist"
            className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-[#9aa1a6] transition-colors hover:text-[#f3f1ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101315]"
          >
            Watchlist
            <ArrowRight className="h-4 w-4" aria-hidden="true" focusable="false" />
          </Link>
        </div>

        <div className="poster-grid">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </section>
    </div>
  );
}
