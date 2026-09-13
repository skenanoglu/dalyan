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

export type CharacterId = 'balik' | 'marti';

export type UpgradeId = 'misina' | 'kursun' | 'makara' | 'kova' | 'tezgah' | 'dolap' | 'mama' | 'motor' | 'durbun';

/** Yükseltme anahtarı → seviye (0'dan başlar). */
export type Upgrades = Record<UpgradeId, number>;

/** Tür → adet. */
export type Catch = Partial<Record<SpeciesId, number>>;

// ---------- Sahne sözleşmeleri ----------

export interface HarborIn {
  lastTrip?: TripSummary;
}
export interface HarborOut {
  zone: ZoneId;
  fast: boolean;
}

export interface VoyageIn {
  zone: ZoneId;
  character: CharacterId;
  /** Varış için geçilmesi gereken engel sayısı. */
  target: number;
}
export interface VoyageOut {
  passed: number;
  arrived: boolean;
  pearls: number;
}

export interface FishingIn {
  zone: ZoneId;
  upgrades: Upgrades;
  bonusSeconds: number;
  bait: number;
  seed: number;
}
export interface FishingOut {
  catch: Catch;
}

export interface MarketIn {
  catch: Catch;
  zone: ZoneId;
  upgrades: Upgrades;
  seed: number;
}
export interface MarketOut {
  /** Toplam net kazanç (cezalar düşülmüş). */
  earned: number;
  retail: number;
  wholesale: number;
  export: number;
  clearance: number;
  penalty: number;
}

export interface TripSummary {
  zone: ZoneId;
  earned: number;
  fish: number;
  newSpecies: SpeciesId[];
  /** Hızlı Git ile gidildiyse null. */
  arrived: boolean | null;
}
