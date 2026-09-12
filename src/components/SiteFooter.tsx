import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

/**
 * The site footer.
 *
 * Deliberately *not* a second `<nav>` landmark (there is already
 * `navigation "Primary"`), and it never links to a movie: the poster/title
 * links inside a card are queried by name in the end-to-end suite, and a
 * duplicate title link in the footer would make those queries ambiguous.
 *
 * The copyright line is asserted verbatim by `Layout.test.tsx`.
 */

const COLUMNS = [
  // Labels are deliberately distinct from the header nav's ("Home",
  // "Watchlist", "Assistant", "Marquee", "Health"): Playwright matches
  // accessible names by substring, so a footer link called "Your watchlist"
  // would make `getByRole("link", { name: "Watchlist" })` ambiguous.
  {
    title: "Browse",
    links: [
      { to: "/", label: "All movies" },
      { to: "/watchlist", label: "Saved for later" },
      { to: "/marquee", label: "3D cinema facade" },
    ],
  },
  {
    title: "Tools",
    links: [
      { to: "/assistant", label: "AI movie finder" },
      { to: "/health", label: "API status" },
    ],
  },
] as const;

const REPO_URL = "https://github.com/Haani-110/Flicks";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[#262b2f] bg-[#0d1012]">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_auto]">
          <div className="space-y-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1012]"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e8a73e] text-base font-bold text-[#1a1a1a]"
              >
                F
              </span>
              <span className="text-lg font-semibold tracking-tight text-[#f3f1ec]">
                Flicks
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-[#9aa1a6]">
              A movie discovery app: browse the catalog, keep a watchlist in
              your browser, ask the assistant what to watch next, and dress a
              3D premiere marquee.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="eyebrow text-[#7d858a]">{column.title}</p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="rounded-sm text-sm text-[#9aa1a6] transition-colors hover:text-[#f3f1ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1012]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="eyebrow text-[#7d858a]">Source</p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-[#262b2f] bg-[#14181a] px-3 py-2 text-sm text-[#9aa1a6] transition-colors hover:border-[#2f3639] hover:text-[#f3f1ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1012]"
            >
              View on GitHub
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" focusable="false" />
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[#1f2427] py-6 text-xs text-[#7d858a] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Flicks. Foundations build.</p>
          <p>
            Posters and metadata courtesy of{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-sm text-[#9aa1a6] underline decoration-dotted underline-offset-2 transition-colors hover:text-[#e8a73e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e]"
            >
              TMDB
            </a>
            . This product uses the TMDB API but is not endorsed or certified by
            TMDB.
          </p>
        </div>
      </div>
    </footer>
  );
}
