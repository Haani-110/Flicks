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
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e8a73e] text-base font-bold text-[#1a1a1a]">
            F
          </span>
          <span className="text-lg font-semibold tracking-tight text-[#f3f1ec]">
            Flicks
          </span>
        </NavLink>

        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/watchlist" className={navLinkClass}>
            Watchlist
          </NavLink>
          <NavLink to="/health" className={navLinkClass}>
            Health
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#101315] text-[#f3f1ec]">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
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
