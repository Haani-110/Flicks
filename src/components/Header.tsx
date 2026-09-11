import { NavLink } from "react-router-dom";

const navigation = [
  { label: "Home", to: "/", end: true },
  { label: "Watchlist", to: "/watchlist", end: false },
  { label: "Health", to: "/health", end: false },
];

export function Header() {
  return (
    <header className="border-b border-white/8 bg-header">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <NavLink
          to="/"
          aria-label="Flicks home"
          className="shrink-0 text-xl font-bold tracking-[-0.04em] text-text-primary transition-colors hover:text-accent"
        >
          Flicks<span className="text-accent">.</span>
        </NavLink>

        <nav aria-label="Primary navigation">
          <ul className="flex items-center gap-1 sm:gap-2">
            {navigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      "block px-2 py-2 text-sm font-medium transition-colors sm:px-3",
                      isActive
                        ? "text-accent"
                        : "text-text-secondary hover:text-text-primary",
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}