#!/usr/bin/env node
/**
 * Writes `public/sitemap.xml` at build time.
 *
 * A sitemap's `<loc>` entries must be absolute URLs, and the absolute origin
 * of this project is only known where it is deployed. Vercel injects
 * VERCEL_PROJECT_PRODUCTION_URL (and VERCEL_URL for previews) into every
 * build, so the file is generated there and *skipped* anywhere the origin is
 * unknown — a sitemap that guesses a domain would be worse than none.
 *
 * The generated file is a build artifact and is gitignored; `public/robots.txt`
 * (committed) does not reference it for the same reason.
 *
 * Usage: node scripts/make-sitemap.mjs
 *   SITEMAP_ORIGIN=https://example.com  override the origin explicitly
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const OUT = path.join(PUBLIC, "sitemap.xml");

/** The static routes, plus one entry per film in the local catalogue. */
function routes() {
  const staticRoutes = ["/", "/watchlist", "/assistant", "/marquee", "/health"];
  const source = readFileSync(path.join(PUBLIC, "..", "src", "data", "movies.ts"), "utf8");
  const filmRoutes = [...source.matchAll(/^\s*id: (\d+),$/gm)].map(([, id]) => `/movie/${id}`);
  return [...staticRoutes, ...filmRoutes];
}

function origin() {
  const fromEnv = process.env.SITEMAP_ORIGIN?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const fromVercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (fromVercel) return `https://${fromVercel.replace(/\/+$/, "")}`;

  return null;
}

const base = origin();

if (!base) {
  if (existsSync(OUT)) rmSync(OUT);
  console.log("sitemap: no origin known (set SITEMAP_ORIGIN) — skipped.");
} else {
  const lastmod = new Date().toISOString().slice(0, 10);
  const entries = routes();
  const urls = entries.map(
    (route) =>
      `  <url>\n    <loc>${base}${route === "/" ? "/" : route}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`,
  ).join("\n");

  mkdirSync(PUBLIC, { recursive: true });
  writeFileSync(
    OUT,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  console.log(`sitemap: wrote public/sitemap.xml for ${base} (${entries.length} urls).`);
}
