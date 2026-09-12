import { Link } from "react-router-dom";
import type { Movie } from "@/data/movies";
import { useWatchlistContext } from "@/context/WatchlistContext";
import { Star, Clock, Plus, Check } from "lucide-react";

export function MovieCard({ movie }: { movie: Movie }) {
  const { ids, toggle } = useWatchlistContext();
  const saved = ids.includes(movie.id);

  return (
    <article className="card group overflow-hidden">
      <Link
        to={`/movie/${movie.id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101315]"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#242a2e]">
          <img
            src={movie.posterPath}
            alt={`${movie.title} poster`}
            width={500}
            height={750}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101315]/90 via-transparent to-transparent opacity-60" aria-hidden="true" />
        </div>
      </Link>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium leading-tight text-[#f3f1ec]">
              <Link
                to={`/movie/${movie.id}`}
                className="hover:text-[#e8a73e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d2124] rounded-sm transition-colors"
              >
                {movie.title}
              </Link>
            </h3>
            <div className="mt-1 flex items-center gap-3 text-xs text-[#9aa1a6]">
              <span>{movie.year}</span>
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-[#e8a73e] text-[#e8a73e]" aria-hidden="true" focusable="false" />
                <span aria-label={`Rating ${movie.rating.toFixed(1)} out of 10`}>{movie.rating.toFixed(1)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#9aa1a6]">
            <Clock className="h-3 w-3" aria-hidden="true" focusable="false" />
            <span>{movie.runtime} min</span>
          </div>
          <button
            type="button"
            onClick={() => toggle(movie.id)}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d2124] ${
              saved
                ? "bg-[#e8a73e] text-[#1a1a1a] hover:bg-[#f0b64d]"
                : "bg-[#242a2e] text-[#9aa1a6] hover:bg-[#2d3438] hover:text-[#f3f1ec]"
            }`}
            aria-label={saved ? `Remove ${movie.title} from watchlist` : `Add ${movie.title} to watchlist`}
            aria-pressed={saved}
            title={saved ? "Remove from watchlist" : "Add to watchlist"}
          >
            {saved ? <Check className="h-4 w-4" aria-hidden="true" focusable="false" /> : <Plus className="h-4 w-4" aria-hidden="true" focusable="false" />}
          </button>
        </div>
      </div>
    </article>
  );
}
