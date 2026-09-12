/**
 * The marquee's configurable surface.
 *
 * Everything here is plain data so it can be unit-tested and persisted without
 * touching three.js: the scene reads these values, the panel writes them, and
 * localStorage keeps them between visits (same convention as the watchlist).
 */

import { normalizeSignText, SIGN_MAX_CHARS, signColumns, GLYPH_HEIGHT } from "./pixel-font";

export const MARQUEE_STORAGE_KEY = "flicks-marquee";

/** How the metal parts of the facade are finished. */
export const FINISHES = {
  chrome: { label: "Chrome", color: "#f2f4f6", metalness: 1, roughness: 0.08 },
  gold: { label: "Gold", color: "#d9a441", metalness: 1, roughness: 0.2 },
  copper: { label: "Copper", color: "#b87333", metalness: 1, roughness: 0.28 },
  matte: { label: "Matte black", color: "#23282b", metalness: 0.25, roughness: 0.85 },
} as const;

export type FinishKey = keyof typeof FINISHES;
export const FINISH_KEYS = Object.keys(FINISHES) as FinishKey[];

/** Bulb colours. The first one is the Flicks house gold. */
export const ACCENTS = {
  amber: { label: "House amber", color: "#e8a73e" },
  ice: { label: "Ice blue", color: "#7fd7ff" },
  magenta: { label: "Premiere magenta", color: "#ff5f9e" },
  lime: { label: "Lime", color: "#a6e22e" },
  ivory: { label: "Ivory", color: "#fff3d6" },
} as const;

export type AccentKey = keyof typeof ACCENTS;
export const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

/** What sits on the pedestal in front of the facade. */
export const CENTERPIECES = {
  reel: { label: "Film reel" },
  projector: { label: "Projector" },
  "film-can": { label: "Film can" },
} as const;

export type CenterpieceKey = keyof typeof CENTERPIECES;
export const CENTERPIECE_KEYS = Object.keys(CENTERPIECES) as CenterpieceKey[];

export type MarqueeConfig = {
  finish: FinishKey;
  accent: AccentKey;
  centerpiece: CenterpieceKey;
  /** What the letter board spells (A–Z, 0–9, a few marks, max SIGN_MAX_CHARS). */
  signText: string;
  /** Revolutions per minute of the turntable; 0 parks it. */
  autoRotate: number;
  /** Bulbs run a chase pattern instead of holding steady. */
  bulbChase: boolean;
  /** A follow spot tracks the pointer across the facade. */
  followCursor: boolean;
  /** X-ray the metal parts. */
  wireframe: boolean;
  /** Renderer exposure — the brightness dial for the whole scene. */
  exposure: number;
};

export const DEFAULT_CONFIG: MarqueeConfig = {
  finish: "chrome",
  accent: "amber",
  centerpiece: "reel",
  signText: "FLICKS",
  autoRotate: 0.35,
  bulbChase: true,
  followCursor: true,
  wireframe: false,
  exposure: 1.1,
};

export const AUTO_ROTATE_RANGE = { min: 0, max: 2, step: 0.05 } as const;
export const EXPOSURE_RANGE = { min: 0.6, max: 1.8, step: 0.05 } as const;

/** What the bulb grid is sized for: the widest sign the config allows. */
export const BOARD_COLUMNS = signColumns(SIGN_MAX_CHARS);
export const BOARD_ROWS = GLYPH_HEIGHT;

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Number(number.toFixed(2))));
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Reads a config back from storage. The stored blob is user-editable and can be
 * from an older release, so every field is validated and falls back
 * individually instead of throwing the whole thing away.
 */
export function parseConfig(raw: unknown): MarqueeConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CONFIG };
  const input = raw as Record<string, unknown>;

  return {
    finish: pick(input.finish, FINISH_KEYS, DEFAULT_CONFIG.finish),
    accent: pick(input.accent, ACCENT_KEYS, DEFAULT_CONFIG.accent),
    centerpiece: pick(input.centerpiece, CENTERPIECE_KEYS, DEFAULT_CONFIG.centerpiece),
    signText: normalizeSignText(
      typeof input.signText === "string" ? input.signText : DEFAULT_CONFIG.signText,
    ),
    autoRotate: clampNumber(
      input.autoRotate,
      AUTO_ROTATE_RANGE.min,
      AUTO_ROTATE_RANGE.max,
      DEFAULT_CONFIG.autoRotate,
    ),
    bulbChase: pickBoolean(input.bulbChase, DEFAULT_CONFIG.bulbChase),
    followCursor: pickBoolean(input.followCursor, DEFAULT_CONFIG.followCursor),
    wireframe: pickBoolean(input.wireframe, DEFAULT_CONFIG.wireframe),
    exposure: clampNumber(
      input.exposure,
      EXPOSURE_RANGE.min,
      EXPOSURE_RANGE.max,
      DEFAULT_CONFIG.exposure,
    ),
  };
}

/** Applies a single change, keeping the rest of the config and the board limits. */
export function applyConfigChange(
  config: MarqueeConfig,
  change: Partial<MarqueeConfig>,
): MarqueeConfig {
  const next: MarqueeConfig = { ...config, ...change };

  return {
    ...next,
    signText: normalizeSignText(next.signText),
    autoRotate: clampNumber(
      next.autoRotate,
      AUTO_ROTATE_RANGE.min,
      AUTO_ROTATE_RANGE.max,
      config.autoRotate,
    ),
    exposure: clampNumber(
      next.exposure,
      EXPOSURE_RANGE.min,
      EXPOSURE_RANGE.max,
      config.exposure,
    ),
  };
}

export function serializeConfig(config: MarqueeConfig): string {
  return JSON.stringify(config);
}

export function storage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    // Private mode / disabled storage: the marquee still works, it just forgets.
    return undefined;
  }
}

export function readStoredConfig(): MarqueeConfig {
  const store = storage();
  if (!store) return { ...DEFAULT_CONFIG };

  try {
    const raw = store.getItem(MARQUEE_STORAGE_KEY);
    return raw ? parseConfig(JSON.parse(raw)) : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeStoredConfig(config: MarqueeConfig): void {
  try {
    storage()?.setItem(MARQUEE_STORAGE_KEY, serializeConfig(config));
  } catch {
    // Quota or disabled storage — config just does not persist.
  }
}

export function clearStoredConfig(): void {
  try {
    storage()?.removeItem(MARQUEE_STORAGE_KEY);
  } catch {
    // Nothing to clean up.
  }
}
