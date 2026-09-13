import type { SpeciesId } from '../../src/app/types';
import { defaultUpgrades } from '../../src/app/upgrades';
import { newMarket } from '../../src/scenes/market/core/market';
import { shapeById } from '../../src/scenes/market/core/shapes';
import type { Cell, MarketState, Piece } from '../../src/scenes/market/core/types';

/** Harf → tür. */
export const LETTER: Record<string, SpeciesId> = {
  h: 'hamsi',
  i: 'istavrit',
  l: 'lufer',
  k: 'kalkan',
  a: 'altin',
  c: 'cizme',
  n: 'naylon',
  p: 'palamut',
};

/**
 * '.' boş; harfler tür. Küçük harf: her kasa ayrı balık. BÜYÜK harf: aynı harfteki
 * bütün kasalar tek balık. Her kasanın değeri `v` (çöpte -1).
 */
export function grid(size: number, rows: string[], v = 1): Cell[] {
  const board: Cell[] = new Array(size * size).fill(null);
  let fish = 1;
  const shared = new Map<string, number>();
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const lower = ch.toLowerCase();
      const sp = LETTER[lower];
      if (!sp) throw new Error(`bilinmeyen harf ${ch}`);
      let id: number;
      if (ch !== lower) {
        if (!shared.has(ch)) shared.set(ch, 1000 + shared.size);
        id = shared.get(ch)!;
      } else {
        id = fish++;
      }
      board[y * size + x] = { sp, fish: id, v: sp === 'cizme' || sp === 'naylon' ? -1 : v };
    });
  });
  return board;
}

let uid = 5000;

export function piece(sp: SpeciesId, shapeId = 'dot', value = 1): Piece {
  return { uid: uid++, sp, shapeId, cells: shapeById(shapeId).cells.map((c) => ({ ...c })), value, cheap: false };
}

/** Kovası belli, tezgâhı `size` olan boş bir pazar. */
export function market(size: 7 | 8 | 9 = 7, extra: Partial<MarketState> = {}): MarketState {
  const upgrades = { ...defaultUpgrades(), tezgah: size - 7 };
  const s = newMarket({ catch: { hamsi: 30 }, zone: 'kiyi', upgrades, seed: 3 });
  return Object.assign(s, extra);
}
