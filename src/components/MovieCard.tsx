import { Link } from "react-router-dom";
import type { Movie } from "@/data/movies";
import { useWatchlistContext } from "@/context/WatchlistContext";
import { PosterImage } from "@/components/PosterImage";
import { Star, Clock, Plus, Check } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * One catalog tile.
 *
 * Structure and accessible names are unchanged from the original on purpose —
 * the poster link, the title link (`{title}`), the poster image
 * (`{title} poster`), the rating (`Rating X out of 10`), the runtime
 * (`{n} min`) and the watchlist toggle (`Add|Remove {title} …`, `aria-pressed`)
 * are all load-bearing for the component tests and the end-to-end flow. What
 * changed is the surface: a lift on hover, a rating badge on the art, a
 * metadata row with a rule above the action, and a poster that degrades
 * gracefully instead of showing a broken-image icon.
 */
export function MovieCard({ movie }: { movie: Movie }) {
  const { ids, toggle } = useWatchlistContext();
  const saved = ids.includes(movie.id);

  return (
    <article className="card card-interactive group flex h-full flex-col overflow-hidden">
      <Link
        to={`/movie/${movie.id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e8a73e]"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#1a1f22]">
          <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]">
            <PosterImage
              src={movie.posterPath}
              alt={`${movie.title} poster`}
              title={movie.title}
            />
          </div>

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#101315] via-[#101315]/10 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-90"
          />

          {/* A star on the art reads as "this one is rated" at a glance. The
              number itself lives once, in the metadata row below — duplicating
              it here would put two "8.3"s on the card, and labelling this
              badge would append it to the poster link's accessible name. */}
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 shadow-[0_1px_6px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"
          >
            <Star
              className="h-3.5 w-3.5 fill-[#e8a73e] text-[#e8a73e]"
              aria-hidden="true"
              focusable="false"
            />
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight text-[#f3f1ec]">
            <Link
              to={`/movie/${movie.id}`}
              className="rounded-sm transition-colors hover:text-[#e8a73e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d2124]"
            >
              {movie.title}
            </Link>
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#9aa1a6]">
            <span>{movie.year}</span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 shrink-0 fill-[#e8a73e] text-[#e8a73e]" aria-hidden="true" focusable="false" />
              <span aria-label={`Rating ${movie.rating.toFixed(1)} out of 10`}>
                {movie.rating.toFixed(1)}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" focusable="false" />
              <span>{movie.runtime} min</span>
            </span>
          </div>

          <p
            aria-hidden="true"
            className="mt-2 truncate text-[11px] uppercase tracking-wide text-[#7d858a]"
          >
            {movie.genres.join(" · ")}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#262b2f]/70 pt-3">
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors",
              saved ? "text-[#e8a73e]" : "text-[#7d858a]",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                saved ? "bg-[#e8a73e]" : "bg-[#3b4348]",
              )}
            />
            {saved ? "Saved" : "Not saved"}
          </span>

          <button
            type="button"
            onClick={() => toggle(movie.id)}
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d2124]",
              saved
                ? "bg-[#e8a73e] text-[#1a1a1a] hover:bg-[#f0b64d]"
                : "bg-[#242a2e] text-[#9aa1a6] hover:bg-[#2d3438] hover:text-[#f3f1ec]",
            )}
            aria-label={
              saved
                ? `Remove ${movie.title} from watchlist`
                : `Add ${movie.title} to watchlist`
            }
            aria-pressed={saved}
            title={saved ? "Remove from watchlist" : "Add to watchlist"}
          >
            {saved ? (
              <Check className="h-4 w-4" aria-hidden="true" focusable="false" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" focusable="false" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
