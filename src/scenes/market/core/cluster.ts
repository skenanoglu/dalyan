import type { SpeciesId } from '../../../app/types';
import { SPECIES } from '../../../app/species';
import type { Cell, Crate } from './types';
import { idx, inBounds, xyOf } from './board';
import { WHOLESALE_MIN, WHOLESALE_MIN_FISH } from './rules';

const DIRS4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Aynı türden yan yana (4 yön) kasalar. */
export interface Group {
  sp: SpeciesId;
  cells: number[];
  /** Kümedeki ayrı balık sayısı. */
  fish: number;
}

/** Bu hücre `sp` kümesine katılır mı? Çöp hiçbir kümeye girmez; altın balık her kümeye girer. */
export function joins(cell: Cell, sp: SpeciesId): boolean {
  if (!cell) return false;
  const s = SPECIES[cell.sp];
  return !s.junk && (cell.sp === sp || s.joker);
}

/** Küme başlatabilen kasa: çöp ve joker kendi başına küme başlatamaz. */
export function canSeed(cell: Cell): cell is Crate {
  if (!cell) return false;
  const s = SPECIES[cell.sp];
  return !s.junk && !s.joker;
}

export function groupFrom(board: Cell[], size: number, start: number, sp: SpeciesId): number[] {
  const seen = new Set<number>([start]);
  const stack = [start];
  while (stack.length > 0) {
    const { x, y } = xyOf(size, stack.pop()!);
    for (const [dx, dy] of DIRS4) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(size, nx, ny)) continue;
      const n = idx(size, nx, ny);
      if (!seen.has(n) && joins(board[n], sp)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return [...seen];
}

export const fishCount = (board: Cell[], cells: number[]): number => new Set(cells.map((i) => board[i]!.fish)).size;

/** Tahtadaki tüm tür kümeleri. Bir altın balık birden fazla türün kümesinde yer alabilir. */
export function findGroups(board: Cell[], size: number): Group[] {
  const visited = new Map<SpeciesId, Set<number>>();
  const out: Group[] = [];
  for (let i = 0; i < board.length; i++) {
    const cell = board[i];
    if (!canSeed(cell)) continue;
    let seen = visited.get(cell.sp);
    if (!seen) {
      seen = new Set();
      visited.set(cell.sp, seen);
    }
    if (seen.has(i)) continue;
    const cells = groupFrom(board, size, i, cell.sp);
    for (const k of cells) seen.add(k);
    out.push({ sp: cell.sp, cells, fish: fishCount(board, cells) });
  }
  return out;
}

export const isWholesale = (g: Group): boolean => g.cells.length >= WHOLESALE_MIN && g.fish >= WHOLESALE_MIN_FISH;

/** Kümenin 8-komşu halkasındaki dolu kasalar (`exclude` hariç). */
export function shockRing(board: Cell[], size: number, cells: number[], exclude: Set<number>): number[] {
  const ring = new Set<number>();
  for (const i of cells) {
    const { x, y } = xyOf(size, i);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(size, nx, ny)) continue;
        const n = idx(size, nx, ny);
        if (board[n] !== null && !exclude.has(n)) ring.add(n);
      }
    }
  }
  return [...ring];
}
