export type ZoneId = 'kiyi' | 'bogaz' | 'cukur' | 'marmara';

export type SpeciesId =
  | 'hamsi'
  | 'istavrit'
  | 'cipura'
  | 'palyaco'
  | 'levrek'
  | 'altin'
  | 'lufer'
  | 'mezgit'
  | 'palamut'
  | 'kalkan'
  | 'kilic'
  | 'fener'
  | 'cizme'
  | 'naylon';

/** Balık tutma yolu: tekneden olta ya da Boğaz'da martı. */
export type ModeId = 'olta' | 'marti';

/** Martının yükseltmeleri. Olta tarafında yükseltme yerine olta ve yem tipleri alınır. */
export type UpgradeId = 'dalis' | 'nefes' | 'gaga' | 'simit';

export type RodId = 'kamis' | 'bambu' | 'karbon' | 'makarali' | 'derin';
export type BaitId = 'ekmek' | 'solucan' | 'karides' | 'sardalya' | 'kalamar';

/** Yükseltme anahtarı → seviye (0'dan başlar). */
export type Upgrades = Record<UpgradeId, number>;

/** Tür → adet. */
export type Catch = Partial<Record<SpeciesId, number>>;

// ---------- Sahne sözleşmeleri ----------

export interface HarborIn {
  lastTrip?: TripSummary;
}
export interface HarborOut {
  mode: ModeId;
  /** Oltanın atılacağı bölge; martıda kullanılmaz. */
  zone: ZoneId;
}

export interface FishingIn {
  zone: ZoneId;
  rod: RodId;
  bait: BaitId;
  seed: number;
}
export interface FishingOut {
  catch: Catch;
}

export interface GullIn {
  upgrades: Upgrades;
  seed: number;
}
export interface GullOut {
  catch: Catch;
  /** Geçilen engel sayısı. */
  passed: number;
}

export interface MarketIn {
  catch: Catch;
  mode: ModeId;
  zone: ZoneId;
}

export interface SaleLine {
  sp: SpeciesId;
  count: number;
  /** Tane fiyatı (çöpte negatif ceza). */
  price: number;
  total: number;
}

export interface MarketOut {
  lines: SaleLine[];
  /** Balıkların toplamı (çarpansız). */
  base: number;
  /** Farklı tür sayısı (çöp hariç). */
  varieties: number;
  /** Çeşit çarpanı (×1 … ×1.8). */
  multiplier: number;
  bonus: number;
  penalty: number;
  /** Net kazanç; eksiye düşmez. */
  earned: number;
}

export interface TripSummary {
  mode: ModeId;
  zone: ZoneId | null;
  earned: number;
  fish: number;
  newSpecies: SpeciesId[];
}
