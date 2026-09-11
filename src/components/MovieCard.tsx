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
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101315]/90 via-transparent to-transparent opacity-60" />
        </div>
      </Link>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/movie/${movie.id}`}
              className="block truncate text-sm font-medium text-[#f3f1ec] hover:text-[#e8a73e] transition-colors"
            >
              {movie.title}
            </Link>
            <div className="mt-1 flex items-center gap-3 text-xs text-[#9aa1a6]">
              <span>{movie.year}</span>
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-[#e8a73e] text-[#e8a73e]" />
                {movie.rating.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#9aa1a6]">
            <Clock className="h-3 w-3" />
            <span>{movie.runtime} min</span>
          </div>
          <button
            type="button"
            onClick={() => toggle(movie.id)}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors ${
              saved
                ? "bg-[#e8a73e] text-[#1a1a1a] hover:bg-[#f0b64d]"
                : "bg-[#242a2e] text-[#9aa1a6] hover:bg-[#2d3438] hover:text-[#f3f1ec]"
            }`}
            aria-label={saved ? `Remove ${movie.title} from watchlist` : `Add ${movie.title} to watchlist`}
            aria-pressed={saved}
            title={saved ? "Remove from watchlist" : "Add to watchlist"}
          >
            {saved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </article>
  );
}
