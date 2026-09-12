import { NavLink, Outlet } from "react-router-dom";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-[#242a2e] text-[#f3f1ec]"
      : "text-[#9aa1a6] hover:text-[#f3f1ec]",
  ].join(" ");

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-[#262b2f] bg-[#14181a]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <NavLink to="/" className="flex items-center gap-2" aria-label="Flicks home">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e8a73e] text-base font-bold text-[#1a1a1a]" aria-hidden="true">
            F
          </span>
          <span className="text-lg font-semibold tracking-tight text-[#f3f1ec]">
            Flicks
          </span>
        </NavLink>

        <nav aria-label="Primary">
          <ul className="flex items-center gap-1 sm:gap-2">
            <li>
              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/watchlist" className={navLinkClass}>
                Watchlist
              </NavLink>
            </li>
            <li>
              <NavLink to="/assistant" className={navLinkClass}>
                Assistant
              </NavLink>
            </li>
            <li>
              <NavLink to="/marquee" className={navLinkClass}>
                Marquee
              </NavLink>
            </li>
            <li>
              <NavLink to="/health" className={navLinkClass}>
                Health
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#101315] text-[#f3f1ec]">
      <a href="#main-content" className="sr-only left-4 top-4 z-50 rounded-md bg-[#e8a73e] px-4 py-2 text-sm font-semibold text-[#1a1a1a] focus:not-sr-only focus:absolute focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#101315]">
        Skip to content
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 focus:outline-none sm:px-6 sm:py-12 lg:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-[#262b2f] bg-[#14181a]">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-[#9aa1a6] sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Flicks. Foundations build.
        </div>
      </footer>
    </div>
  );
}
