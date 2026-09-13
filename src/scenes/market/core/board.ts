import type { Cell, Coord, Piece } from './types';
import { rotations } from './shapes';

export const idx = (size: number, x: number, y: number): number => y * size + x;

export const xyOf = (size: number, i: number): Coord => ({ x: i % size, y: Math.floor(i / size) });

export const inBounds = (size: number, x: number, y: number): boolean => x >= 0 && y >= 0 && x < size && y < size;

export const emptyBoard = (size: number): Cell[] => new Array<Cell>(size * size).fill(null);

export const isBoardEmpty = (board: Cell[]): boolean => board.every((c) => c === null);

export function canPlace(board: Cell[], size: number, cells: Coord[], ox: number, oy: number): boolean {
  for (const c of cells) {
    const x = ox + c.x;
    const y = oy + c.y;
    if (!inBounds(size, x, y) || board[idx(size, x, y)] !== null) return false;
  }
  return true;
}

export function fitsAnywhere(board: Cell[], size: number, cells: Coord[]): boolean {
  for (let oy = 0; oy < size; oy++) {
    for (let ox = 0; ox < size; ox++) {
      if (canPlace(board, size, cells, ox, oy)) return true;
    }
  }
  return false;
}

export function fitsAnyRotation(board: Cell[], size: number, cells: Coord[]): boolean {
  return rotations(cells).some((r) => fitsAnywhere(board, size, r));
}

export function anyPlayable(board: Cell[], size: number, pieces: (Piece | null)[]): boolean {
  return pieces.some((p) => p !== null && fitsAnyRotation(board, size, p.cells));
}

export function findFullLines(board: Cell[], size: number): { rows: number[]; cols: number[] } {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let k = 0; k < size; k++) {
    let rowFull = true;
    let colFull = true;
    for (let j = 0; j < size; j++) {
      if (board[idx(size, j, k)] === null) rowFull = false;
      if (board[idx(size, k, j)] === null) colFull = false;
    }
    if (rowFull) rows.push(k);
    if (colFull) cols.push(k);
  }
  return { rows, cols };
}

export function lineIndices(size: number, rows: number[], cols: number[]): number[] {
  const set = new Set<number>();
  for (const y of rows) for (let x = 0; x < size; x++) set.add(idx(size, x, y));
  for (const x of cols) for (let y = 0; y < size; y++) set.add(idx(size, x, y));
  return [...set];
}
