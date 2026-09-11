import { Link, useParams } from "react-router-dom";
import { getMovie, movies } from "@/data/movies";
import { MovieCard } from "@/components/MovieCard";
import { useWatchlistContext } from "@/context/WatchlistContext";
import {
  ArrowLeft,
  Star,
  Clock,
  Calendar,
  Plus,
  Check,
  Bookmark,
} from "lucide-react";

export function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const movie = getMovie(id);
  const { ids, toggle } = useWatchlistContext();
  const saved = movie ? ids.includes(movie.id) : false;

  if (!movie) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm font-medium uppercase tracking-widest text-[#e05555]">
          Not found
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#f3f1ec] sm:text-3xl">
          Movie not found
        </h1>
        <p className="max-w-xl text-sm text-[#9aa1a6] sm:text-base">
          We couldn't find a movie with that ID. It may have been removed or
          doesn't exist.
        </p>
        <Link to="/" className="btn btn-primary mt-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  const related = movies
    .filter(
      (m) =>
        m.id !== movie.id &&
        m.genres.some((g) => movie.genres.includes(g))
    )
    .slice(0, 4);

  return (
    <div className="space-y-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9aa1a6] transition-colors hover:text-[#f3f1ec]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
        {/* Poster */}
        <div className="mx-auto w-full max-w-[280px] md:mx-0">
          <div className="card overflow-hidden">
            <img
              src={movie.posterPath}
              alt={`${movie.title} poster`}
              className="aspect-[2/3] w-full object-cover"
            />
          </div>
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-[#f3f1ec] sm:text-4xl">
              {movie.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#9aa1a6]">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {movie.year}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {movie.runtime} min
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-[#e8a73e] text-[#e8a73e]" />
                <span className="font-medium text-[#f3f1ec]">
                  {movie.rating.toFixed(1)}
                </span>
                / 10
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {movie.genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full bg-[#242a2e] px-3 py-1 text-xs font-medium text-[#9aa1a6]"
              >
                {genre}
              </span>
            ))}
          </div>

          <p className="max-w-2xl text-sm leading-relaxed text-[#f3f1ec]/90 sm:text-base">
            {movie.overview}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => toggle(movie.id)}
              className={`btn ${saved ? "btn-primary" : "btn-secondary"}`}
              aria-pressed={saved}
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  In watchlist
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add to watchlist
                </>
              )}
            </button>
            {!saved && ids.length > 0 && (
              <Link to="/watchlist" className="btn btn-primary">
                <Bookmark className="h-4 w-4" />
                View watchlist
              </Link>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="space-y-5">
          <h2 className="text-xl font-semibold text-[#f3f1ec] sm:text-2xl">
            More like this
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
