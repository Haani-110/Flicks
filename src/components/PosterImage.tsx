import { useState } from "react";
import { Film } from "lucide-react";
import { cn } from "@/utils/cn";

export type PosterImageProps = {
  src: string;
  /** Descriptive alt text — required, the poster carries meaning. */
  alt: string;
  title: string;
  width?: number;
  height?: number;
  /** Above-the-fold posters should be fetched eagerly and at high priority. */
  priority?: boolean;
  className?: string;
};

/**
 * A movie poster with the three states a real network produces.
 *
 * 1. **Loading** — the box keeps its 2:3 dimensions (no layout shift) and a
 *    sweep skeleton sits where the art will be.
 * 2. **Loaded** — the skeleton fades out, the poster fades in.
 * 3. **Broken** — if TMDB is unreachable or the file 404s, the reader gets a
 *    labelled placeholder naming the film instead of a browser broken-image
 *    icon. The `<img>` is removed so assistive tech is not handed both a
 *    broken image and a placeholder.
 *
 * `width`/`height` are always emitted, and `loading`/`decoding` are set here
 * rather than at each call site, so no poster can regress into causing CLS.
 */
export function PosterImage({
  src,
  alt,
  title,
  width = 500,
  height = 750,
  priority = false,
  className,
}: PosterImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${title} poster unavailable`}
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center",
          "bg-[radial-gradient(120%_100%_at_50%_0%,#232a2e_0%,#171b1e_58%,#121618_100%)]",
          className,
        )}
      >
        <Film className="h-7 w-7 text-[#3b4348]" aria-hidden="true" focusable="false" />
        <p className="line-clamp-3 text-xs font-medium leading-snug text-[#7d858a]">
          {title}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-[#5c6469]">
          Poster unavailable
        </p>
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div aria-hidden="true" className={cn("skeleton absolute inset-0", className)} />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </>
  );
}
