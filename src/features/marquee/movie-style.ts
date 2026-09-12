import type { Movie } from "@/data/movies";
import { ACCENT_KEYS, ACCENTS as BULB_ACCENTS, type AccentKey } from "./config";
import { cleanedSignText, normalizeSignText, SIGN_MAX_CHARS } from "./pixel-font";

/**
 * Accent colours for the poster rail.
 *
 * Chosen per movie from a fixed palette rather than pulled from the artwork:
 * the catalog's poster URLs are remote, and this scene is deliberately
 * network-free, so the wall is styled from data we already have.
 */
const POSTER_ACCENTS = ["#e8a73e", "#7fd7ff", "#ff5f9e", "#a6e22e", "#c9a2ff", "#ff8f5f", "#5fd7b0"];

export function movieAccent(movie: Movie): string {
  const index = Math.abs(Number(movie.id) || movie.title.length) % POSTER_ACCENTS.length;
  return POSTER_ACCENTS[index];
}

/** Genre + runtime, the line under the title on a poster. */
export function movieTagline(movie: Movie): string {
  return [movie.genres[0], `${movie.runtime} min`].filter(Boolean).join(" · ");
}

/**
 * What the letter board can spell of a title: greedy whole words that fit in
 * SIGN_MAX_CHARS, falling back to a truncation when even the first word is too
 * long ("Everything Everywhere…" → "EVERYTH").
 */
export function boardTextFor(movie: Movie): string {
  const words = movie.title
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let text = "";
  for (const word of words) {
    const candidate = text ? `${text} ${word}` : word;
    // Measure before truncation: the board limit decides whether the word fits.
    if (cleanedSignText(candidate).length > SIGN_MAX_CHARS) break;
    text = candidate;
  }

  if (!text) text = words[0] ?? "";
  return normalizeSignText(text) || normalizeSignText(words[0] ?? "");
}

/**
 * The bulb colour closest to a movie's accent, so featuring a film also changes
 * the marquee's mood — without ever leaving the palette the panel offers.
 */
export function accentKeyFor(hex: string): AccentKey | undefined {
  const target = hex.toLowerCase();
  return ACCENT_KEYS.find((key) => BULB_ACCENTS[key].color.toLowerCase() === target);
}
