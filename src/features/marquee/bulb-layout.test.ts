import { describe, expect, it } from "vitest";
import { bulbLayout, CELL_X, CELL_Y, signHeight, signWidth } from "./bulb-layout";
import { signMatrix } from "./pixel-font";

describe("bulbLayout", () => {
  it("places one bulb per cell of the grid", () => {
    const matrix = signMatrix("FLICKS");
    const bulbs = bulbLayout(matrix);

    expect(bulbs).toHaveLength(matrix.rows * matrix.cols);
    expect(new Set(bulbs.map((bulb) => `${bulb.row}:${bulb.col}`)).size).toBe(bulbs.length);
  });

  it("keeps the letter board centred on its own origin", () => {
    const bulbs = bulbLayout(signMatrix("AB"));

    const left = Math.min(...bulbs.map((bulb) => bulb.x));
    const right = Math.max(...bulbs.map((bulb) => bulb.x));
    const top = Math.max(...bulbs.map((bulb) => bulb.y));
    const bottom = Math.min(...bulbs.map((bulb) => bulb.y));

    expect(left + right).toBeCloseTo(0, 5);
    expect(top + bottom).toBeCloseTo(0, 5);
  });

  it("grows to the right and down at the bulb pitch", () => {
    const bulbs = bulbLayout(signMatrix("AB"));
    const first = bulbs.find((bulb) => bulb.row === 0 && bulb.col === 0)!;

    expect(bulbs.find((bulb) => bulb.row === 0 && bulb.col === 1)!.x - first.x).toBeCloseTo(CELL_X);
    expect(bulbs.find((bulb) => bulb.row === 1 && bulb.col === 0)!.y - first.y).toBeCloseTo(-CELL_Y);
  });

  it("carries the font's lit cells through to the bulbs", () => {
    const matrix = signMatrix("A");
    const layout = bulbLayout(matrix);

    expect(layout.filter((bulb) => bulb.lit)).toHaveLength(18);
    layout.forEach((bulb) => {
      expect(bulb.lit).toBe(matrix.cells[bulb.row][bulb.col]);
    });
  });

  it("has nothing to place for an empty board", () => {
    expect(bulbLayout(signMatrix(""))).toEqual([]);
  });

  it("measures the board in world units", () => {
    expect(signWidth(10)).toBeCloseTo(10 * CELL_X);
    expect(signHeight(7)).toBeCloseTo(7 * CELL_Y);
    expect(signHeight(7)).toBeLessThan(signWidth(10));
  });
});
