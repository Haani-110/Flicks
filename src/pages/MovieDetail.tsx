import { Link, useParams } from "react-router-dom";
import { getMovie, movies } from "@/data/movies";
import { MovieCard } from "@/components/MovieCard";
import { PosterImage } from "@/components/PosterImage";
import { useWatchlistContext } from "@/context/WatchlistContext";
import {
  ArrowLeft,
  Star,
  Clock,
  Calendar,
  Plus,
  Check,
  Bookmark,
  Film,
} from "lucide-react";

/**
 * One film's page.
 *
 * The heading is the title at level 1, the poster is fetched at high priority
 * (it is the LCP candidate), and the watchlist button keeps its exact
 * `Add to watchlist` / `In watchlist` labels and `aria-pressed` — the primary
 * end-to-end flow asserts all three. The backdrop is a CSS layer, not an
 * `<img>`, so the poster stays the only image with an accessible name.
 */
export function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const movie = getMovie(id);
  const { ids, toggle } = useWatchlistContext();
  const saved = movie ? ids.includes(movie.id) : false;

  if (!movie) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="eyebrow text-[#e05555]">Not found</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#f3f1ec] sm:text-3xl">
          Movie not found
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-[#9aa1a6] sm:text-base">
          We couldn&apos;t find a movie with that ID. It may have been removed
          or the link may be out of date.
        </p>
        <Link to="/" className="btn btn-primary mt-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" focusable="false" />
          Back to Home
        </Link>
      </div>
    );
  }

  const related = movies
    .filter(
      (m) => m.id !== movie.id && m.genres.some((g) => movie.genres.includes(g)),
    )
    .slice(0, 4);

  return (
    <div className="space-y-10 sm:space-y-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-[#9aa1a6] transition-colors hover:text-[#f3f1ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101315]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" focusable="false" />
        Back
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
        {/* Poster */}
        <div className="mx-auto w-full max-w-[240px] sm:max-w-[280px] md:mx-0 md:max-w-none">
          <div className="card relative overflow-hidden shadow-[0_24px_60px_-30px_rgba(0,0,0,0.95)]">
            <div className="relative aspect-[2/3] w-full bg-[#1a1f22]">
              <PosterImage
                src={movie.posterPath}
                alt={`${movie.title} poster`}
                title={movie.title}
                priority
                className="h-full w-full"
              />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 space-y-6">
          <div
            className="relative overflow-hidden rounded-xl border border-[#262b2f] p-5 sm:p-7"
            style={{
              backgroundImage: `linear-gradient(100deg, rgba(16,19,21,0.95) 18%, rgba(16,19,21,0.72) 55%, rgba(16,19,21,0.42) 100%), url(${movie.backdropPath})`,
              backgroundSize: "cover",
              backgroundPosition: "center 20%",
              backgroundColor: "#14181a",
            }}
          >
            <div className="relative space-y-3">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[#f3f1ec] sm:text-4xl [text-shadow:0_2px_16px_rgba(0,0,0,0.7)]">
                {movie.title}
              </h1>

              <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#d8dde0]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[#9aa1a6]" aria-hidden="true" focusable="false" />
                  <dt className="sr-only">Released</dt>
                  <dd>{movie.year}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#9aa1a6]" aria-hidden="true" focusable="false" />
                  <dt className="sr-only">Runtime</dt>
                  <dd>{movie.runtime} min</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star
                    className="h-4 w-4 fill-[#e8a73e] text-[#e8a73e]"
                    aria-hidden="true"
                    focusable="false"
                  />
                  <dt className="sr-only">Rating</dt>
                  <dd>
                    <span
                      className="font-semibold text-[#f3f1ec]"
                      aria-label={`Rating ${movie.rating.toFixed(1)} out of 10`}
                    >
                      {movie.rating.toFixed(1)}
                    </span>
                    <span className="text-[#9aa1a6]"> / 10</span>
                  </dd>
                </div>
              </dl>

              <ul className="flex flex-wrap gap-2" aria-label="Genres">
                {movie.genres.map((genre) => (
                  <li key={genre}>
                    <span className="chip border-[#2f3639] bg-black/35 text-[#d8dde0] backdrop-blur-sm">
                      {genre}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="eyebrow text-[#7d858a]">Synopsis</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-[#d8dde0] sm:text-base">
              {movie.overview}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-[#262b2f] pt-6">
            <button
              type="button"
              onClick={() => toggle(movie.id)}
              className={`btn ${saved ? "btn-primary" : "btn-secondary"}`}
              aria-pressed={saved}
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" focusable="false" />
                  In watchlist
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden="true" focusable="false" />
                  Add to watchlist
                </>
              )}
            </button>
            {!saved && ids.length > 0 && (
              <Link to="/watchlist" className="btn btn-secondary">
                <Bookmark className="h-4 w-4" aria-hidden="true" focusable="false" />
                View watchlist
              </Link>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="section border-t border-[#262b2f] pt-8" aria-labelledby="related-heading">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#262b2f] bg-[#14181a]"
            >
              <Film className="h-4 w-4 text-[#e8a73e]" aria-hidden="true" focusable="false" />
            </span>
            <div>
              <h2
                id="related-heading"
                className="text-xl font-semibold tracking-tight text-[#f3f1ec] sm:text-2xl"
              >
                More like this
              </h2>
              <p className="mt-1 text-sm text-[#9aa1a6]">
                Sharing a genre with {movie.title}.
              </p>
            </div>
          </div>

          <div className="poster-grid">
            {related.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
