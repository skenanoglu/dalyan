import type { PowerId } from './types';

/** Toptan satış: aynı türden en az bu kadar kasa… */
export const WHOLESALE_MIN = 8;
/** …ve en az bu kadar ayrı balık (tek kalkan kendi başına satılmaz). */
export const WHOLESALE_MIN_FISH = 2;
/** İhracat kamyonu: çevresindeki kasaları da satar. */
export const EXPORT_MIN = 14;

export const RETAIL_X = 1;
export const WHOLESALE_X = 2;
export const EXPORT_X = 3;
/** Pazar kapanınca tahtada ve elde kalanlar. */
export const CLEARANCE_X = 0.5;
/** Toptancının ucuz hamsisi. */
export const CHEAP_X = 0.5;

/** Kova küçükse bant toptancı hamsisiyle bu sayıya tamamlanır. */
export const MIN_PIECES = 20;
export const ACTIVE_SLOTS = 3;
export const PREVIEW_COUNT = 2;

/** Bu kadar hamle üst üste satışsız geçerse kombo biter. */
export const COMBO_KEEP_MOVES = 3;
/** Kombo her adımda satışlara %10 ekler, en fazla ×2. */
export const comboBonus = (combo: number): number => Math.min(2, 1 + 0.1 * Math.max(0, combo - 1));

export const ENERGY_PER_CHARGE = 10;
export const MAX_CHARGES = 3;
export const MAX_ENERGY = ENERGY_PER_CHARGE * MAX_CHARGES;
export const BOARD_CLEAR_ENERGY = 3;

export const POWER_COST: Record<PowerId, number> = { cat: 1, swap: 1, shuffle: 2 };

export const charges = (energy: number): number => Math.floor(energy / ENERGY_PER_CHARGE);

export function energyGain(o: { lines: number; groups: number; exports: number; combo: number }): number {
  let e = o.lines + o.groups * 2 + o.exports * 3;
  if (o.combo >= 3) e += 1;
  return e;
}
