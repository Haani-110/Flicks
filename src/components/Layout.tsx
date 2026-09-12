import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";
import { cn } from "@/utils/cn";

export function Header() {
  const [elevated, setElevated] = useState(false);

  // A shadow once the page has scrolled, so the sticky bar reads as being
  // above the content instead of merging into it.
  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-[#14181a]/90 backdrop-blur-md transition-shadow duration-200",
        elevated
          ? "border-[#262b2f] shadow-[0_10px_30px_-24px_rgba(0,0,0,1)]"
          : "border-[#262b2f]/70",
      )}
    >
      {/* The marquee bulbs, reduced to a 2px light leak under the bar. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[#e8a73e]/35 to-transparent"
      />

      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <NavLink
          to="/"
          aria-label="Flicks home"
          className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a73e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14181a]"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e8a73e] text-base font-bold text-[#1a1a1a] shadow-[0_0_18px_-4px_rgba(232,167,62,0.8)]"
          >
            F
          </span>
          <span className="text-lg font-semibold tracking-tight text-[#f3f1ec]">
            Flicks
          </span>
        </NavLink>

        <SiteNav />
      </div>
    </header>
  );
}

/** Sends the reader to the top of the new page instead of the old offset. */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

export function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-[#101315] text-[#f3f1ec]">
      <ScrollToTop />

      <a
        href="#main-content"
        className="sr-only left-4 top-4 z-50 rounded-md bg-[#e8a73e] px-4 py-2 text-sm font-semibold text-[#1a1a1a] focus:not-sr-only focus:absolute focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#101315]"
      >
        Skip to content
      </a>

      <Header />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 focus:outline-none sm:px-6 sm:py-12 lg:px-8"
      >
        {/* Re-mounts on navigation, so each page arrives with the same short
            rise — transform/opacity only, no layout shift. */}
        <div key={pathname} className="rise-in">
          <Outlet />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
