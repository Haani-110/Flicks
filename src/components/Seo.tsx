import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { movies } from "@/data/movies";

/**
 * Document-level metadata: title, description, canonical and Open Graph.
 *
 * This app is a client-rendered SPA, so the only place the *real* origin is
 * known is the browser. `index.html` therefore ships the origin-independent
 * half of the social tags, and this component writes the rest — canonical,
 * `og:url`, `og:image` and the per-route title/description — from
 * `location.origin` at runtime. The previous hard-coded canonical named a
 * domain this project does not serve from, which told crawlers this page
 * lives somewhere it does not.
 *
 * Titles for `/movie/:id` are resolved from the same local catalogue the page
 * renders, so the tag and the heading can never disagree.
 */

const SITE_NAME = "Flicks";
const SITE_DESCRIPTION =
  "Discover movies, save your watchlist, and ask the AI to find your next favorite film.";

type RouteMeta = { title: string; description: string };

function routeMeta(pathname: string): RouteMeta {
  if (pathname === "/") {
    return {
      title: `${SITE_NAME} — discover your next favorite film`,
      description: SITE_DESCRIPTION,
    };
  }
  if (pathname === "/watchlist") {
    return {
      title: `Watchlist — ${SITE_NAME}`,
      description: "The films you have saved, in one place. Stored on this device.",
    };
  }
  if (pathname === "/assistant") {
    return {
      title: `Assistant — ${SITE_NAME}`,
      description:
        "Ask the Flicks assistant about the catalogue: recommendations, ratings and what to watch next.",
    };
  }
  if (pathname === "/marquee") {
    return {
      title: `Marquee — ${SITE_NAME}`,
      description: "A 3D cinema marquee you can configure: bulbs, materials and type.",
    };
  }
  if (pathname === "/health") {
    return {
      title: `Health check — ${SITE_NAME}`,
      description: "Diagnostics for this deployment: API reachability and build info.",
    };
  }

  const detail = pathname.match(/^\/movie\/(\d+)$/);
  if (detail) {
    const movie = movies.find((entry) => entry.id === Number(detail[1]));
    if (movie) {
      return {
        title: `${movie.title} (${movie.year}) — ${SITE_NAME}`,
        description: truncate(movie.overview, 155),
      };
    }
    return {
      title: `Film not found — ${SITE_NAME}`,
      description: SITE_DESCRIPTION,
    };
  }

  return {
    title: `Page not found — ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
  };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function upsertMeta(attr: "name" | "property", key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}

export function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const { title, description } = routeMeta(pathname);
    const origin = window.location.origin;
    const canonical = `${origin}${pathname === "/" ? "/" : pathname}`;

    document.title = title;
    upsertMeta("name", "description", description);
    upsertCanonical(canonical);

    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", `${origin}/og.png`);
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
  }, [pathname]);

  return null;
}
