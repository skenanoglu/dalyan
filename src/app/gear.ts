import type { BaitId, BoatId, HookId, LineId, RodId, SpeciesId } from './types';

/** Olta tipi: ne kadar hızlı indirdiği ve ne kadar hızlı çektiği. Derinliği artık misina belirler. */
export interface Rod {
  id: RodId;
  name: string;
  price: number;
  desc: string;
  /** İniş hızı (px/sn). */
  drop: number;
  /** Çekme hızı çarpanı. */
  reel: number;
  /** Yalnızca en güçlü olta; en dayanıklı misinayla köpekbalığı tutmayı mümkün kılar. */
  sharkReady?: boolean;
}

/** Misina: ne kadar derine inebildiği ve dayanıklılığı (misina kopma cezasını azaltır). */
export interface Line {
  id: LineId;
  name: string;
  price: number;
  desc: string;
  /** En derin nokta (metre). */
  depth: number;
  /** 0-4: misina kopma cezasını azaltır; en üst seviye köpekbalığına dayanır. */
  durability: number;
  sharkReady?: boolean;
}

/** İğne: fiyatı bu tavanın üstündeki türler ısırmaz (köpekbalığı hariç, o oltaya/misinaya bağlı). */
export interface Hook {
  id: HookId;
  name: string;
  price: number;
  desc: string;
  maxPrice: number;
}

/** Tekne: bir seferde kovaya sığacak en fazla balık (çöp dahil). */
export interface Boat {
  id: BoatId;
  name: string;
  price: number;
  desc: string;
  capacity: number;
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
  kamis: { id: 'kamis', name: 'Kamış Olta', price: 0, desc: 'Yavaş iner, yavaş çeker', drop: 190, reel: 1 },
  bambu: { id: 'bambu', name: 'Bambu Olta', price: 250, desc: 'Biraz daha hızlı iner ve çeker', drop: 230, reel: 1.15 },
  karbon: { id: 'karbon', name: 'Karbon Olta', price: 900, desc: 'Hafif ve hızlı çekiş', drop: 280, reel: 1.35 },
  makarali: { id: 'makarali', name: 'Makaralı Olta', price: 3000, desc: 'Büyük balığı çabuk çeker', drop: 340, reel: 1.6 },
  derin: { id: 'derin', name: 'Derin Deniz Oltası', price: 9000, desc: 'En güçlü çekiş; en dayanıklı misinayla köpekbalığı tutulur', drop: 400, reel: 2, sharkReady: true },
};

export const ROD_ORDER: RodId[] = ['kamis', 'bambu', 'karbon', 'makarali', 'derin'];

export const LINES: Record<LineId, Line> = {
  ince: { id: 'ince', name: 'İnce Misina', price: 0, desc: 'Sığ sularda tutar', depth: 12, durability: 0 },
  orta: { id: 'orta', name: 'Orta Misina', price: 250, desc: 'Biraz daha derine iner, biraz daha dayanıklı', depth: 20, durability: 1 },
  kalin: { id: 'kalin', name: 'Kalın Misina', price: 900, desc: 'Orta sulara iner', depth: 38, durability: 2 },
  celik: { id: 'celik', name: 'Çelik Misina', price: 3000, desc: 'Büyük balığa dayanır', depth: 70, durability: 3 },
  balina: { id: 'balina', name: 'Balina Misinası', price: 9000, desc: 'Marmara dibine kadar iner; en güçlü oltayla köpekbalığına dayanır', depth: 110, durability: 4, sharkReady: true },
};

export const LINE_ORDER: LineId[] = ['ince', 'orta', 'kalin', 'celik', 'balina'];

export const HOOKS: Record<HookId, Hook> = {
  adi: { id: 'adi', name: 'Adi İğne', price: 0, desc: 'Sadece küçük balıklar ısırır', maxPrice: 25 },
  sert: { id: 'sert', name: 'Sert İğne', price: 800, desc: 'Orta boy balıklar da ısırır', maxPrice: 70 },
  ozel: { id: 'ozel', name: 'Özel İğne', price: 3500, desc: 'Altın balık ve kalkan da ısırır', maxPrice: 200 },
  usta: { id: 'usta', name: 'Usta İğnesi', price: 12000, desc: 'Fener balığı dahil her balık ısırır', maxPrice: 350 },
};

export const HOOK_ORDER: HookId[] = ['adi', 'sert', 'ozel', 'usta'];

export const BOATS: Record<BoatId, Boat> = {
  sandal: { id: 'sandal', name: 'Sandal', price: 0, desc: 'Küçük kova', capacity: 10 },
  kayik: { id: 'kayik', name: 'Kayık', price: 600, desc: 'Biraz daha büyük kova', capacity: 16 },
  motor: { id: 'motor', name: 'Motorbot', price: 2500, desc: 'Ferah bir kova', capacity: 24 },
  yat: { id: 'yat', name: 'Yat', price: 8000, desc: 'Büyük kova', capacity: 34 },
  gemi: { id: 'gemi', name: 'Balıkçı Gemisi', price: 22000, desc: 'Devasa kova', capacity: 50 },
};

export const BOAT_ORDER: BoatId[] = ['sandal', 'kayik', 'motor', 'yat', 'gemi'];

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
export const isLineId = (v: unknown): v is LineId => typeof v === 'string' && v in LINES;
export const isHookId = (v: unknown): v is HookId => typeof v === 'string' && v in HOOKS;
export const isBoatId = (v: unknown): v is BoatId => typeof v === 'string' && v in BOATS;
