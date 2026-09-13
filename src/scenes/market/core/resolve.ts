import type { SpeciesId } from '../../../app/types';
import type { Cell, CellRef, Piece } from './types';
import { canPlace, findFullLines, idx, isBoardEmpty, lineIndices, xyOf } from './board';
import { canSeed, fishCount, findGroups, groupFrom, isWholesale, shockRing } from './cluster';
import { EXPORT_MIN, EXPORT_X, RETAIL_X, WHOLESALE_X } from './rules';

export interface SoldGroup {
  sp: SpeciesId;
  cells: CellRef[];
  export: boolean;
}

export interface Resolution {
  placed: CellRef[];
  rows: number[];
  cols: number[];
  /** Perakende satılan çizgi kasaları (kümeye ya da halkaya düşenler hariç). */
  lineCells: CellRef[];
  groups: SoldGroup[];
  ring: CellRef[];
  /** Kombo uygulanmamış satışlar (₺). */
  sales: { retail: number; wholesale: number; export: number };
  /** Parçanın yerleştikten sonra dahil olduğu küme (önizleme sayacı için). */
  preview: { sp: SpeciesId; cells: number[]; fish: number } | null;
  cleared: number;
  after: Cell[];
  boardClear: boolean;
}

const refOf = (board: Cell[], size: number, i: number): CellRef => ({ ...xyOf(size, i), crate: board[i]! });

/**
 * Bir yerleştirmenin tüm sonucunu hesaplar; tahtayı değiştirmez.
 * Hem hamlede hem de sürükleme önizlemesinde kullanılır.
 * Her kasa bir kez satılır; öncelik: toptan/ihracat > ihracat halkası > çizgi.
 * Çöp satılmaz ama temizlenen çizgide ya da halkada ceza yazılmadan kalkar.
 */
export function resolvePlacement(board: Cell[], size: number, piece: Piece, ox: number, oy: number): Resolution | null {
  if (!canPlace(board, size, piece.cells, ox, oy)) return null;

  const b = board.slice();
  const v = piece.value / piece.cells.length;
  const placedIdx = piece.cells.map((c) => {
    const i = idx(size, ox + c.x, oy + c.y);
    b[i] = { sp: piece.sp, fish: piece.uid, v, cheap: piece.cheap };
    return i;
  });

  const { rows, cols } = findFullLines(b, size);

  const sold = new Map<number, 'wholesale' | 'export'>();
  const groups: SoldGroup[] = [];
  for (const g of findGroups(b, size).filter(isWholesale)) {
    const kind = g.cells.length >= EXPORT_MIN ? 'export' : 'wholesale';
    const own = g.cells.filter((i) => !sold.has(i));
    for (const i of own) sold.set(i, kind);
    groups.push({ sp: g.sp, cells: own.map((i) => refOf(b, size, i)), export: kind === 'export' });
  }

  const ringSet = new Set<number>();
  for (const g of groups) {
    if (!g.export) continue;
    const cells = g.cells.map((c) => idx(size, c.x, c.y));
    for (const i of shockRing(b, size, cells, new Set(sold.keys()))) ringSet.add(i);
  }

  const lineSet = lineIndices(size, rows, cols).filter((i) => !sold.has(i) && !ringSet.has(i));

  const sales = { retail: 0, wholesale: 0, export: 0 };
  const worth = (i: number): number => Math.max(0, b[i]!.v);
  for (const [i, kind] of sold) {
    if (kind === 'export') sales.export += worth(i) * EXPORT_X;
    else sales.wholesale += worth(i) * WHOLESALE_X;
  }
  for (const i of ringSet) sales.retail += worth(i) * RETAIL_X;
  for (const i of lineSet) sales.retail += worth(i) * RETAIL_X;

  const cleared = new Set<number>([...sold.keys(), ...ringSet, ...lineSet]);
  const after = b.slice();
  for (const i of cleared) after[i] = null;

  const first = placedIdx[0];
  const preview = canSeed(b[first])
    ? (() => {
        const cells = groupFrom(b, size, first, piece.sp);
        return { sp: piece.sp, cells, fish: fishCount(b, cells) };
      })()
    : null;

  return {
    placed: placedIdx.map((i) => refOf(b, size, i)),
    rows,
    cols,
    lineCells: lineSet.map((i) => refOf(b, size, i)),
    groups,
    ring: [...ringSet].map((i) => refOf(b, size, i)),
    sales,
    preview,
    cleared: cleared.size,
    after,
    boardClear: cleared.size > 0 && isBoardEmpty(after),
  };
}
