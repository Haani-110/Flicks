import type { SignMatrix } from "./pixel-font";

/** Bulb pitch on the board, in world units. */
export const CELL_X = 0.118;
export const CELL_Y = 0.132;

export type Bulb = {
  /** Position on the board, centred on the origin. */
  x: number;
  y: number;
  lit: boolean;
  row: number;
  col: number;
};

/**
 * Turns the font's on/off grid into bulb positions.
 *
 * Pure geometry, kept out of the renderer so the layout can be asserted
 * without a GPU: the board is centred on its own origin, the first row is the
 * top one, and the spacing is the bulb pitch.
 */
export function bulbLayout(matrix: SignMatrix, cellX = CELL_X, cellY = CELL_Y): Bulb[] {
  const bulbs: Bulb[] = [];

  matrix.cells.forEach((row, rowIndex) => {
    row.forEach((lit, colIndex) => {
      bulbs.push({
        x: (colIndex - (matrix.cols - 1) / 2) * cellX,
        y: ((matrix.rows - 1) / 2 - rowIndex) * cellY,
        lit,
        row: rowIndex,
        col: colIndex,
      });
    });
  });

  return bulbs;
}

/** World width of a sign showing `cols` bulb columns. */
export function signWidth(cols: number, cellX = CELL_X): number {
  return cols * cellX;
}

/** World height of a sign showing `rows` bulb rows. */
export function signHeight(rows: number, cellY = CELL_Y): number {
  return rows * cellY;
}
