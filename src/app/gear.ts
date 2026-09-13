import type { BaitId, RodId, SpeciesId } from './types';

/** Olta tipi: ne kadar derine inebildiği ve ne kadar hızlı çektiği. */
export interface Rod {
  id: RodId;
  name: string;
  price: number;
  desc: string;
  /** Misina boyu (metre): en derin nokta. */
  depth: number;
  /** İniş hızı (px/sn). */
  drop: number;
  /** Çekme hızı çarpanı. */
  reel: number;
}

/** Yem tipi: bazı türleri daha çok çeker. */
export interface Bait {
  id: BaitId;
  name: string;
  price: number;
  desc: string;
  likes: SpeciesId[];
}

/** Yemin sevdiği türlerin görülme ağırlığı bu kadarla çarpılır. */
export const BAIT_PULL = 3;

export const RODS: Record<RodId, Rod> = {
  kamis: { id: 'kamis', name: 'Kamış Olta', price: 0, desc: 'Sığ sularda küçük balıklar', depth: 12, drop: 190, reel: 1 },
  bambu: { id: 'bambu', name: 'Bambu Olta', price: 250, desc: 'Biraz daha derine iner', depth: 20, drop: 230, reel: 1.15 },
  karbon: { id: 'karbon', name: 'Karbon Olta', price: 900, desc: 'Hafif ve hızlı; orta sular', depth: 38, drop: 280, reel: 1.35 },
  makarali: { id: 'makarali', name: 'Makaralı Olta', price: 3000, desc: 'Büyük balığı çabuk çeker', depth: 70, drop: 340, reel: 1.6 },
  derin: { id: 'derin', name: 'Derin Deniz Oltası', price: 9000, desc: 'Marmara dibine kadar', depth: 110, drop: 400, reel: 2 },
};

export const ROD_ORDER: RodId[] = ['kamis', 'bambu', 'karbon', 'makarali', 'derin'];

export const BAITS: Record<BaitId, Bait> = {
  ekmek: { id: 'ekmek', name: 'Ekmek', price: 0, desc: 'Hamsi ve istavrit bayılır', likes: ['hamsi', 'istavrit'] },
  solucan: { id: 'solucan', name: 'Solucan', price: 150, desc: 'Çipura, levrek, palyaço', likes: ['cipura', 'levrek', 'palyaco'] },
  karides: { id: 'karides', name: 'Karides', price: 600, desc: 'Lüfer, mezgit, palamut', likes: ['lufer', 'mezgit', 'palamut'] },
  sardalya: { id: 'sardalya', name: 'Sardalya', price: 2000, desc: 'Kalkan ve kılıç balığı', likes: ['kalkan', 'kilic'] },
  kalamar: { id: 'kalamar', name: 'Kalamar', price: 5000, desc: 'Fener balığı ve altın balık', likes: ['fener', 'altin'] },
};

export const BAIT_ORDER: BaitId[] = ['ekmek', 'solucan', 'karides', 'sardalya', 'kalamar'];

export const isRodId = (v: unknown): v is RodId => typeof v === 'string' && v in RODS;
export const isBaitId = (v: unknown): v is BaitId => typeof v === 'string' && v in BAITS;
