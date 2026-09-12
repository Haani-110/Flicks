import { useEffect, useId, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useWatchlistContext } from "@/context/WatchlistContext";
import { cn } from "@/utils/cn";

/**
 * The primary navigation.
 *
 * One `<nav aria-label="Primary">` and one set of links at every breakpoint —
 * on a phone the list is collapsed behind a disclosure button instead of being
 * duplicated into a second menu, so the accessible name of each link ("Home",
 * "Watchlist", …) is stable and there is exactly one navigation landmark.
 *
 * The watchlist count is `aria-hidden`: it is a visual affordance, and keeping
 * it out of the accessible name means `link "Watchlist"` still resolves.
 */

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/watchlist", label: "Watchlist", end: false },
  { to: "/assistant", label: "Assistant", end: false },
  { to: "/marquee", label: "Marquee", end: false },
  { to: "/health", label: "Health", end: false },
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14181a]",
    isActive
      ? "bg-[#242a2e] text-[#f3f1ec]"
      : "text-[#9aa1a6] hover:bg-[#1d2124] hover:text-[#f3f1ec]",
  );

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const location = useLocation();
  const { ids } = useWatchlistContext();

  // Navigating from the menu closes it — otherwise the panel stays open over
  // the page you just landed on.
  useEffect(() => {
    // Closing the panel is synchronisation with the router, not cascading
    // state: the route changed underneath us, so the menu is stale.
    // eslint-disable-next-line react/set-state-in-effect
    setOpen(false);
  }, [location.pathname]);

  // Escape closes and returns focus to the button, per the disclosure pattern.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Keep focus inside the panel while it is the only thing on screen.
  useEffect(() => {
    if (!open) return;
    const first = listRef.current?.querySelector<HTMLAnchorElement>("a");
    first?.focus();
  }, [open]);

  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent text-[#9aa1a6]",
          "transition-colors hover:bg-[#1d2124] hover:text-[#f3f1ec]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14181a]",
          "md:hidden",
        )}
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" focusable="false" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" focusable="false" />
        )}
      </button>

      <ul
        id={panelId}
        ref={listRef}
        className={cn(
          "items-center gap-1",
          // Desktop: always a row.
          "md:flex",
          // Phone: the disclosure panel. `static` (not absolute) so an open
          // menu pushes the page down instead of floating over content.
          open
            ? "fade-in absolute inset-x-0 top-full z-30 flex-col border-b border-[#262b2f] bg-[#14181a] px-4 py-3 shadow-[0_18px_30px_-18px_rgba(0,0,0,0.9)]"
            : "hidden",
        )}
      >
        {LINKS.map((link) => (
          <li key={link.to} className="md:flex md:items-center">
            <NavLink to={link.to} end={link.end} className={linkClass}>
              <span className="flex items-center gap-2">
                {link.label}
                {link.to === "/watchlist" && ids.length > 0 && (
                  <span
                    aria-hidden="true"
                    className="rounded-full bg-[#e8a73e] px-1.5 py-0.5 text-[10px] font-bold leading-none text-[#1a1a1a]"
                  >
                    {ids.length}
                  </span>
                )}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
