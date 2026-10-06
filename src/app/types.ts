import type { AchievementId } from './achievements';

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
  | 'naylon'
  | 'pet'
  | 'kopekbaligi'
  | 'kalamar'
  | 'ahtapot';

/** Olta seferinin havası. */
export type WeatherId = 'gunes' | 'yagmur' | 'firtina';

export type RodId = 'kamis' | 'bambu' | 'karbon' | 'makarali' | 'derin';
export type BaitId = 'ekmek' | 'solucan' | 'karides' | 'sardalya' | 'kalamar';
/** Misina: derinlik ve dayanıklılık sağlar; oltadan ayrı alınır. */
export type LineId = 'ince' | 'orta' | 'kalin' | 'celik' | 'balina';
/** İğne: hangi türlerin oltaya takılabileceğini (fiyat tavanı) belirler. */
export type HookId = 'adi' | 'sert' | 'ozel' | 'usta';
/** Tekne: bir seferde tutulabilecek en fazla balık sayısını belirler. */
export type BoatId = 'sandal' | 'kayik' | 'motor' | 'yat' | 'gemi';
/** Dalış tüpü: zıpkınla avda ne kadar derine inileceğini ve yüzme hızını belirler. */
export type TankId = 'mini' | 'orta' | 'derin' | 'teknik';
/** Ava olta ile ya da zıpkın + tüple dalarak çıkılır. */
export type FishMode = 'olta' | 'zipkin';

/** Tür → adet. */
export type Catch = Partial<Record<SpeciesId, number>>;

// ---------- Sahne sözleşmeleri ----------

export interface HarborIn {
  lastTrip?: TripSummary;
  /** Bir sonraki olta seferinin havası. */
  weather: WeatherId;
}
export interface HarborOut {
  zone: ZoneId;
  /** Olta gece mi atılacak. */
  night: boolean;
  /** Olta ile mi, zıpkın + tüple dalarak mı çıkılacak. */
  mode: FishMode;
}

export interface FishingIn {
  zone: ZoneId;
  rod: RodId;
  /** İğnelere takılı yemler (1-3 adet); her biri kendi sevdiği türleri çeker. */
  baitSlots: BaitId[];
  /** Verilmezse en zayıf misina/iğne/tekne varsayılır (ör. sahte av/testler). */
  line?: LineId;
  hook?: HookId;
  boat?: BoatId;
  /** Verilmezse olta; 'zipkin' ise tank ile dalınır (iğne/yem kullanılmaz). */
  mode?: FishMode;
  tank?: TankId;
  /** Zıpkın seviyesi: dalış başına zıpkın sayısını belirler (verilmezse 1). */
  harpoonLevel?: number;
  /** Av süresi (sn); verilmezse 90. */
  duration?: number;
  weather: WeatherId;
  night: boolean;
  seed: number;
}
export interface FishingOut {
  catch: Catch;
}

export interface MarketIn {
  catch: Catch;
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
  zone: ZoneId;
  earned: number;
  fish: number;
  newSpecies: SpeciesId[];
  /** Bu seferin sonunda açılan başarımlar (bkz. app/achievements.ts). */
  newAchievements: AchievementId[];
  /** Bu seferde tamamlanan günlük görevlerden kazanılan ekstra ödül. */
  questReward: number;
}
