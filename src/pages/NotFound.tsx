import { Link } from "react-router-dom";
import { Compass, ArrowLeft, Sparkles } from "lucide-react";

/**
 * 404.
 *
 * Was a nested `<main>` inside the layout's `<main>`, which produced two
 * `main` landmarks on one page; it is a labelled region now. `Page not found`
 * and the `Go home` link are unchanged.
 */
export function NotFound() {
  return (
    <div
      role="region"
      aria-labelledby="notfound-heading"
      className="flex min-h-[60vh] flex-col items-center justify-center py-12 text-center"
    >
      <div className="card relative w-full max-w-lg overflow-hidden p-8 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e8a73e]/50 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(232,167,62,0.16)_0%,transparent_68%)]"
        />

        <p
          aria-hidden="true"
          className="font-mono text-6xl font-bold leading-none tracking-tighter text-[#242a2e] sm:text-7xl"
        >
          404
        </p>

        <div
          className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#2f3639] bg-[#242a2e]"
          aria-hidden="true"
        >
          <Compass className="h-6 w-6 text-[#e8a73e]" aria-hidden="true" focusable="false" />
        </div>

        <h1
          id="notfound-heading"
          className="mt-4 text-2xl font-semibold tracking-tight text-[#f3f1ec] sm:text-3xl"
        >
          Page not found
        </h1>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#9aa1a6] sm:text-base">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
          The catalog is still where you left it.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn btn-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" focusable="false" />
            Go home
          </Link>
          <Link to="/assistant" className="btn btn-secondary">
            <Sparkles
              className="h-4 w-4 text-[#e8a73e]"
              aria-hidden="true"
              focusable="false"
            />
            Ask what to watch
          </Link>
        </div>
      </div>
    </div>
  );
}
