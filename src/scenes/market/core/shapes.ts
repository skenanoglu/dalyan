import type { Coord } from './types';

export interface ShapeDef {
  id: string;
  weight: number;
  cells: Coord[];
}

// '#' = dolu hücre. Aynalı çiftler (L/J, S/Z) ayrı tanımlı çünkü döndürme aynalamaz.
const RAW: [id: string, weight: number, rows: string[]][] = [
  ['dot', 0.6, ['#']],
  ['i2', 1.0, ['##']],
  ['i3', 1.1, ['###']],
  ['i4', 1.0, ['####']],
  ['i5', 0.7, ['#####']],
  ['o2', 1.1, ['##', '##']],
  ['r23', 0.75, ['###', '###']],
  ['o3', 0.55, ['###', '###', '###']],
  ['corner', 1.1, ['#.', '##']],
  ['l4', 0.8, ['#.', '#.', '##']],
  ['j4', 0.8, ['.#', '.#', '##']],
  ['l5', 0.65, ['#..', '#..', '###']],
  ['t4', 0.9, ['###', '.#.']],
  ['s4', 0.7, ['.##', '##.']],
  ['z4', 0.7, ['##.', '.##']],
  ['u5', 0.55, ['#.#', '###']],
  ['plus', 0.45, ['.#.', '###', '.#.']],
];

export function normalize(cells: Coord[]): Coord[] {
  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  return cells
    .map((c) => ({ x: c.x - minX, y: c.y - minY }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function parse(rows: string[]): Coord[] {
  const cells: Coord[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '#') cells.push({ x, y });
    });
  });
  return normalize(cells);
}

export function bounds(cells: Coord[]): { w: number; h: number } {
  let w = 0;
  let h = 0;
  for (const c of cells) {
    w = Math.max(w, c.x + 1);
    h = Math.max(h, c.y + 1);
  }
  return { w, h };
}

/** Saat yönünde 90°. */
export function rotateCW(cells: Coord[]): Coord[] {
  const { h } = bounds(cells);
  return normalize(cells.map((c) => ({ x: h - 1 - c.y, y: c.x })));
}

export function sameCells(a: Coord[], b: Coord[]): boolean {
  if (a.length !== b.length) return false;
  const na = normalize(a);
  const nb = normalize(b);
  return na.every((c, i) => c.x === nb[i].x && c.y === nb[i].y);
}

/** Birbirinden farklı tüm dönüşler. */
export function rotations(cells: Coord[]): Coord[][] {
  const out: Coord[][] = [];
  let cur = normalize(cells);
  for (let i = 0; i < 4; i++) {
    if (!out.some((r) => sameCells(r, cur))) out.push(cur);
    cur = rotateCW(cur);
  }
  return out;
}

export const SHAPES: ShapeDef[] = RAW.map(([id, weight, rows]) => ({ id, weight, cells: parse(rows) }));

export const MAX_PIECE_CELLS = Math.max(...SHAPES.map((s) => s.cells.length));

export function shapeById(id: string): ShapeDef {
  const shape = SHAPES.find((s) => s.id === id);
  if (!shape) throw new Error(`Bilinmeyen şekil: ${id}`);
  return shape;
}
