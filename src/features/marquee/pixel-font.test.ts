import { describe, expect, it } from "vitest";
import {
  explainSignText,
  GLYPH_HEIGHT,
  normalizeSignText,
  SIGN_CHARSET,
  signBulbCount,
  signColumns,
  signMatrix,
  SIGN_MAX_CHARS,
  GLYPH_GAP,
  GLYPH_WIDTH,
} from "./pixel-font";

describe("normalizeSignText", () => {
  it("uppercases and keeps what the board can draw", () => {
    expect(normalizeSignText("matinee")).toBe("MATINEE");
  });

  it("treats characters it cannot draw as separators", () => {
    expect(normalizeSignText("DUNE#II")).toBe("DUNE II");
    expect(normalizeSignText("A★B")).toBe("A B");
    // A colon is part of the charset, so it stays on the board.
    expect(normalizeSignText("DUNE:II")).toBe("DUNE:II");
  });

  it("collapses runs of spaces and trims the ends", () => {
    expect(normalizeSignText("  FLICKS   NOW  ")).toBe("FLICKS N");
  });

  it("stops at what fits on the board and does not leave a trailing space", () => {
    expect(normalizeSignText("PREMIERE NIGHT")).toHaveLength(SIGN_MAX_CHARS);
    expect(normalizeSignText("PREMIERE NIGHT")).toBe("PREMIERE");
    expect(normalizeSignText("SOLD OUT NOW")).toBe("SOLD OUT");
  });

  it("renders an empty board for text it cannot draw at all", () => {
    expect(normalizeSignText("★★★")).toBe("");
  });
});

describe("signMatrix", () => {
  it("lays glyphs out on a 5x7 grid with a gap between letters", () => {
    const matrix = signMatrix("AB");

    expect(matrix.rows).toBe(GLYPH_HEIGHT);
    expect(matrix.cols).toBe(2 * GLYPH_WIDTH + GLYPH_GAP);
    expect(matrix.cells).toHaveLength(GLYPH_HEIGHT);
    expect(matrix.cells.every((row) => row.length === matrix.cols)).toBe(true);
  });

  it("lights the bulbs a letter needs and nothing in the gap", () => {
    const matrix = signMatrix("A");
    const lit = matrix.cells.flat().filter(Boolean).length;

    // 3 + 2 + 2 + 5 + 2 + 2 + 2 — the shape of the letter itself.
    expect(lit).toBe(18);
    expect(matrix.cols).toBe(GLYPH_WIDTH);
  });

  it("gives every character in the charset at least one lit bulb", () => {
    for (const char of SIGN_CHARSET) {
      const matrix = signMatrix(char);
      expect(matrix.cells.flat().some(Boolean), `glyph for "${char}" is blank`).toBe(true);
    }
  });

  it("keeps an unknown character's space blank instead of shifting the layout", () => {
    const withUnknown = signMatrix("A★B");
    const withoutUnknown = signMatrix("A B");

    expect(withUnknown.cols).toBe(withoutUnknown.cols);
    expect(withUnknown.cells).toEqual(withoutUnknown.cells);
  });

  it("is blank for empty text", () => {
    const matrix = signMatrix("");
    expect(matrix.cols).toBe(0);
    expect(matrix.cells.flat().some(Boolean)).toBe(false);
  });
});

describe("board measurements", () => {
  it("counts the columns a run of characters occupies", () => {
    expect(signColumns(0)).toBe(0);
    expect(signColumns(1)).toBe(GLYPH_WIDTH);
    expect(signColumns(4)).toBe(4 * GLYPH_WIDTH + 3 * GLYPH_GAP);
  });

  it("counts the bulbs a sign needs", () => {
    expect(signBulbCount("FLICKS")).toBe(signMatrix("FLICKS").cols * GLYPH_HEIGHT);
  });
});

describe("explainSignText", () => {
  it("reports nothing dropped for text that fits", () => {
    expect(explainSignText("FLICKS")).toEqual({
      normalized: "FLICKS",
      dropped: [],
      truncated: false,
    });
  });

  it("lists the dropped characters so the field can say what happened", () => {
    const explanation = explainSignText("SOLD#OUT");

    expect(explanation.normalized).toBe("SOLD OUT");
    expect(explanation.dropped).toEqual(["#"]);
  });

  it("flags text that had to be cut", () => {
    const explanation = explainSignText("DOUBLE BILL");

    expect(explanation.truncated).toBe(true);
    expect(explanation.normalized).toBe("DOUBLE B");
  });

  it("does not flag a cut that only trimmed spaces", () => {
    expect(explainSignText("MATINEE ").truncated).toBe(false);
  });
});
