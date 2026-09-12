import { cn } from "@/utils/cn";

export type RouteFallbackVariant = "grid" | "detail" | "chat" | "stage";

/**
 * What the reader sees while a route chunk is in flight.
 *
 * Shaped like the page it is standing in for, so the swap is a fade rather
 * than a reflow — and deliberately free of named landmarks: a transient
 * `group "3D premiere marquee"` would collide with the real one in the
 * end-to-end suite (and with a screen reader) for the moment both exist.
 */
export function RouteFallback({
  variant = "grid",
  className,
}: {
  variant?: RouteFallbackVariant;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className={cn("space-y-8", className)}
    >
      <span className="sr-only">Loading…</span>

      <div aria-hidden="true" className="space-y-4">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-8 w-64 max-w-full" />
        <div className="skeleton h-4 w-96 max-w-full" />
      </div>

      {variant === "grid" && (
        <div aria-hidden="true" className="poster-grid">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="card overflow-hidden">
              <div className="skeleton aspect-[2/3] w-full rounded-none" />
              <div className="space-y-2 p-4">
                <div className="skeleton h-4 w-4/5" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === "detail" && (
        <div
          aria-hidden="true"
          className="grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]"
        >
          <div className="skeleton aspect-[2/3] w-full max-w-[280px]" />
          <div className="space-y-3">
            <div className="skeleton h-9 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-10 w-44" />
          </div>
        </div>
      )}

      {variant === "chat" && (
        <div aria-hidden="true" className="card space-y-4 p-5">
          <div className="ml-auto h-12 w-2/3 rounded-lg bg-[#242a2e]" />
          <div className="mr-auto h-16 w-3/4 rounded-lg bg-[#1d2124]" />
          <div className="ml-auto h-12 w-1/2 rounded-lg bg-[#242a2e]" />
          <div className="skeleton h-16 w-full" />
        </div>
      )}

      {variant === "stage" && (
        <div aria-hidden="true" className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="skeleton aspect-[16/10] w-full" />
          <div className="space-y-3">
            <div className="skeleton h-6 w-32" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
