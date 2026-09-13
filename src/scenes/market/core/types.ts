import type { SpeciesId, ZoneId } from '../../../app/types';

export interface Coord {
  x: number;
  y: number;
}

/** Tezgâhtaki bir kasa. */
export interface Crate {
  sp: SpeciesId;
  /** Hangi balıktan (parçadan) geldiği; toptan satışta "en az 2 balık" kuralı için. */
  fish: number;
  /** Kasa başına ₺ (balığın değeri / kasa sayısı). Çöpte negatif = ceza. */
  v: number;
  /** Toptancının ucuz hamsisi (kasada işaretli görünür). */
  cheap?: boolean;
}

export type Cell = Crate | null;

export interface CellRef extends Coord {
  crate: Crate;
}

/** Banttan gelen bir balık. */
export interface Piece {
  uid: number;
  sp: SpeciesId;
  shapeId: string;
  cells: Coord[];
  /** Balığın toplam değeri (₺); çöpte negatif. */
  value: number;
  /** Toptancının ucuz hamsisi. */
  cheap: boolean;
}

export type Source = { from: 'slot' | 'hold'; i: number };

export type Status = 'playing' | 'rescue' | 'closed';

export type CloseReason = 'empty' | 'stuck' | 'manual';

export interface Ledger {
  retail: number;
  wholesale: number;
  export: number;
  clearance: number;
  penalty: number;
}

export interface MarketState {
  size: number;
  board: Cell[];
  /** Aktif yuvalar; bant bitince sondan boşalır. */
  slots: (Piece | null)[];
  /** Soğuk dolap. */
  holds: (Piece | null)[];
  /** Sıradaki balıklar (ilk ikisi önizlemede görünür). */
  bant: Piece[];
  zone: ZoneId;
  /** Takasta seçilebilecek türler. */
  species: SpeciesId[];
  combo: number;
  dryMoves: number;
  energy: number;
  ledger: Ledger;
  rng: number;
  nextUid: number;
  status: Status;
  closeReason: CloseReason | null;
}

export type PowerId = 'cat' | 'swap' | 'shuffle';

export type Action =
  | { type: 'rotate'; src: Source }
  | { type: 'place'; src: Source; x: number; y: number }
  /** Yuva ↔ dolap: boş dolaba koyar ya da yer değiştirir. */
  | { type: 'hold'; slot: number; hold: number }
  | { type: 'cat'; x: number; y: number }
  | { type: 'swap'; src: Source; sp: SpeciesId }
  | { type: 'shuffle' }
  | { type: 'close' };

export type MarketEvent =
  | { type: 'rotated'; uid: number }
  | { type: 'placed'; cells: CellRef[] }
  | { type: 'lines'; rows: number[]; cols: number[]; cells: CellRef[] }
  | { type: 'wholesale'; sp: SpeciesId; cells: CellRef[]; export: boolean }
  | { type: 'ring'; cells: CellRef[] }
  /** `at`: tahta koordinatında (hücre birimi) uçan yazının çıkacağı nokta. */
  | { type: 'sale'; amount: number; at: Coord }
  | { type: 'combo'; combo: number }
  | { type: 'boardClear' }
  | { type: 'energy'; amount: number; charges: number; chargedUp: boolean }
  | { type: 'held'; uid: number; swapped: boolean }
  | { type: 'shift' }
  | { type: 'cat'; cell: CellRef }
  | { type: 'swap'; uid: number; sp: SpeciesId }
  | { type: 'shuffle' }
  | { type: 'rescue' }
  | { type: 'closed'; reason: CloseReason; clearance: number; penalty: number };
