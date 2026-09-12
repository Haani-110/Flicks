/**
 * A 5x7 bitmap font for the marquee letter board.
 *
 * The sign is built from physical bulbs, so the "font" is really a grid of
 * on/off cells — no font file, no text geometry, nothing to download. Keeping
 * it as data also makes the sign trivially unit-testable.
 */

export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;
/** Blank columns between two glyphs on the board. */
export const GLYPH_GAP = 1;
/** Longest word the board can spell, in characters. */
export const SIGN_MAX_CHARS = 8;

const BLANK = [
  ".....",
  ".....",
  ".....",
  ".....",
  ".....",
  ".....",
  ".....",
];

const GLYPHS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["....#", "....#", "....#", "....#", "#...#", "#...#", ".###."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  0: [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  1: ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  2: [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  3: ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  4: ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  5: ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  6: [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  7: ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  8: [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  9: [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "'": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", "..##.", "..##."],
  ":": [".....", "..#..", "..#..", ".....", "..#..", "..#..", "....."],
  " ": BLANK,
};

/** Characters the board can render; anything else is dropped. */
export const SIGN_CHARSET = Object.keys(GLYPHS).filter((char) => char !== " ");

/** Columns a string of `chars` characters occupies, including gaps. */
export function signColumns(chars: number): number {
  if (chars <= 0) return 0;
  return chars * GLYPH_WIDTH + (chars - 1) * GLYPH_GAP;
}

/**
 * Uppercases and replaces anything the board cannot draw with a space, then
 * collapses and trims. Unsupported characters act as separators rather than
 * being deleted, so "DUNE: PART TWO" becomes "DUNE PART TWO" instead of
 * "DUNEPARTTWO".
 */
export function cleanedSignText(text: string): string {
  return [...text.toUpperCase()]
    .map((char) => (char === " " || char in GLYPHS ? char : " "))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** The cleaned text, cut to what the board can display. */
export function normalizeSignText(text: string, maxChars = SIGN_MAX_CHARS): string {
  return cleanedSignText(text).slice(0, maxChars).trimEnd();
}

export type SignTextExplanation = {
  /** What will actually be spelled on the board. */
  normalized: string;
  /** Characters that could not be rendered, in the order they were typed. */
  dropped: string[];
  /** True when the board cut the text short. */
  truncated: boolean;
};

/**
 * Tells the user what happened to their input instead of silently changing it:
 * the board drops characters it has no glyph for and stops at SIGN_MAX_CHARS.
 */
export function explainSignText(text: string, maxChars = SIGN_MAX_CHARS): SignTextExplanation {
  const upper = text.toUpperCase();
  const dropped = [
    ...new Set([...upper].filter((char) => char !== " " && !(char in GLYPHS))),
  ];
  const supported = cleanedSignText(text);
  const normalized = normalizeSignText(text, maxChars);

  return {
    normalized,
    dropped,
    truncated: supported.replace(/\s/g, "").length > normalized.replace(/\s/g, "").length,
  };
}

export type SignMatrix = {
  /** Number of bulb columns the text needs. */
  cols: number;
  rows: number;
  /** `cells[row][col]` — true where a bulb should be lit. */
  cells: boolean[][];
};

/**
 * Lays the text out as a bulb grid. Unknown characters render blank rather than
 * shifting the layout, so a partially supported word still lines up.
 */
export function signMatrix(text: string): SignMatrix {
  const normalized = normalizeSignText(text);
  const chars = [...normalized];
  const cols = signColumns(chars.length);
  const cells = Array.from({ length: GLYPH_HEIGHT }, () => Array.from({ length: cols }, () => false));

  chars.forEach((char, index) => {
    const glyph = GLYPHS[char] ?? BLANK;
    const offset = index * (GLYPH_WIDTH + GLYPH_GAP);

    for (let row = 0; row < GLYPH_HEIGHT; row += 1) {
      const line = glyph[row] ?? ".....";
      for (let col = 0; col < GLYPH_WIDTH; col += 1) {
        if (line[col] === "#") cells[row][offset + col] = true;
      }
    }
  });

  return { cols, rows: GLYPH_HEIGHT, cells };
}

/** How many bulbs a sign needs — the canvas uses this to size one InstancedMesh. */
export function signBulbCount(text: string): number {
  const { cells } = signMatrix(text);
  return cells.length * (cells[0]?.length ?? 0);
}
