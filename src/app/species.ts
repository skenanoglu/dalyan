import type { SpeciesId } from './types';

export interface Species {
  id: SpeciesId;
  name: string;
  /** Pazarda tane fiyatı (₺). Çöpte negatif = ceza. */
  price: number;
  /** Olta için yaşadığı derinlik aralığı (metre). Küçük balık sığda, büyük balık derinde. */
  depth: [number, number];
  /** Görülme ağırlığı. */
  weight: number;
  junk: boolean;
  /** Altın balık ve köpekbalığı gibi nadir ve değerli türler. */
  joker: boolean;
  /** Arayüzde türün rengi. */
  color: string;
  /** Balık Avı'ndaki gövde renkleri. */
  body: string;
  belly: string;
  fin: string;
}

type Row = [
  name: string,
  price: number,
  depth: [number, number],
  weight: number,
  color: string,
  body: string,
  belly: string,
  fin: string,
  flags?: { junk?: boolean; joker?: boolean },
];

// Fiyat, derinlik ve ağırlıklar Balık Avı'nın TYPES tablosundan (BalikAvi/js/veri.js).
const ROWS: Record<SpeciesId, Row> = {
  hamsi: ['Hamsi', 10, [0, 7], 5, '#1fd8f5', '#7fa7c0', '#e6f2f8', '#5f879f'],
  istavrit: ['İstavrit', 15, [2, 12], 4, '#4d7cff', '#8fa9bd', '#eaf4fa', '#6d8ba0'],
  cipura: ['Çipura', 20, [3, 14], 3.6, '#5dffb0', '#aeb9c2', '#eef2f4', '#87949e'],
  palyaco: ['Palyaço Balığı', 25, [6, 16], 2.2, '#ff8a2a', '#ff7b1c', '#ffa65c', '#e05a00'],
  levrek: ['Levrek', 30, [8, 22], 3, '#9b6bff', '#62798a', '#d5dde3', '#4d6272'],
  altin: ['Altın Balık', 100, [13, 21], 0.7, '#ffd23f', '#ffcf33', '#fff1a8', '#f0a000', { joker: true }],
  lufer: ['Lüfer', 45, [12, 30], 2.6, '#ff3ea5', '#7e93a6', '#e8eef3', '#5d7182'],
  mezgit: ['Mezgit', 55, [20, 40], 2.2, '#e0b878', '#b9a07c', '#f0e6d2', '#95805f'],
  palamut: ['Palamut', 70, [25, 50], 2, '#ff4b4b', '#5d7f96', '#e2ecf2', '#456478'],
  kalkan: ['Kalkan', 120, [35, 70], 1.6, '#c6ff3d', '#8c7d5e', '#d8cdb0', '#6d6046'],
  kilic: ['Kılıç Balığı', 200, [45, 90], 1.1, '#d8e6ff', '#4f6d86', '#dce8f0', '#39566d'],
  fener: ['Fener Balığı', 350, [70, 110], 0.9, '#f0abfc', '#3c3350', '#5b4f73', '#2a2439'],
  cizme: ['Eski Çizme', -5, [5, 25], 1.2, '#7b8794', '#5a4636', '#6b5543', '#3f3126', { junk: true }],
  naylon: ['Naylon Poşet', -8, [3, 60], 1.1, '#7b8794', '#d9e2e8', '#f2f6f8', '#b8c4cc', { junk: true }],
  // En güçlü olta + misinayla tutulabilir; aksi halde oltadaki balığı kapan ya da misinayı koparan bir tehlikedir (bkz. fishing/data.ts).
  kopekbaligi: ['Köpekbalığı', 2600, [10, 60], 0.8, '#7f8c99', '#7f8c99', '#dfe6ea', '#5d6d7e', { joker: true }],
};

export const SPECIES_ORDER: SpeciesId[] = [
  'hamsi',
  'istavrit',
  'cipura',
  'palyaco',
  'levrek',
  'altin',
  'lufer',
  'mezgit',
  'palamut',
  'kalkan',
  'kilic',
  'fener',
  'cizme',
  'naylon',
  'kopekbaligi',
];

export const SPECIES = Object.fromEntries(
  SPECIES_ORDER.map((id) => {
    const [name, price, depth, weight, color, body, belly, fin, flags] = ROWS[id];
    const s: Species = {
      id,
      name,
      price,
      depth,
      weight,
      color,
      body,
      belly,
      fin,
      junk: flags?.junk ?? false,
      joker: flags?.joker ?? false,
    };
    return [id, s];
  }),
) as Record<SpeciesId, Species>;

/** Bu fiyat ve üstü nadir sayılır. */
export const RARE_PRICE = 45;

export const isSpeciesId = (v: string): v is SpeciesId => v in SPECIES;

/** Oltanın inebildiği derinlikte görülebilen türler. */
export function speciesInReach(maxDepth: number): Species[] {
  return SPECIES_ORDER.map((id) => SPECIES[id]).filter((s) => s.depth[0] <= maxDepth);
}
