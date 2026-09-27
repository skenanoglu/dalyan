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
  /** Bu oltaya takılabilecek en fazla iğne; ucuz oltalar tek iğne taşır. */
  hookCapacity: number;
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
  icon: string;
  price: number;
  desc: string;
  likes: SpeciesId[];
}

/** Yemin sevdiği türlerin görülme ağırlığı bu kadarla çarpılır. */
export const BAIT_PULL = 3;

export const RODS: Record<RodId, Rod> = {
  kamis: { id: 'kamis', name: 'Kamış Olta', price: 0, desc: 'Yavaş iner, yavaş çeker', drop: 190, reel: 1, hookCapacity: 1 },
  bambu: { id: 'bambu', name: 'Bambu Olta', price: 400, desc: 'Biraz daha hızlı iner ve çeker', drop: 230, reel: 1.15, hookCapacity: 1 },
  karbon: { id: 'karbon', name: 'Karbon Olta', price: 1400, desc: 'Hafif ve hızlı çekiş; 2 iğne taşır', drop: 280, reel: 1.35, hookCapacity: 2 },
  makarali: { id: 'makarali', name: 'Makaralı Olta', price: 4500, desc: 'Büyük balığı çabuk çeker; 2 iğne taşır', drop: 340, reel: 1.6, hookCapacity: 2 },
  derin: {
    id: 'derin',
    name: 'Derin Deniz Oltası',
    price: 14000,
    desc: 'En güçlü çekiş; 3 iğne taşır; en dayanıklı misinayla köpekbalığı tutulur',
    drop: 400,
    reel: 2,
    hookCapacity: 3,
    sharkReady: true,
  },
};

export const ROD_ORDER: RodId[] = ['kamis', 'bambu', 'karbon', 'makarali', 'derin'];

export const LINES: Record<LineId, Line> = {
  ince: { id: 'ince', name: 'İnce Misina', price: 0, desc: 'Sığ sularda tutar', depth: 12, durability: 0 },
  orta: { id: 'orta', name: 'Orta Misina', price: 400, desc: 'Biraz daha derine iner, biraz daha dayanıklı', depth: 20, durability: 1 },
  kalin: { id: 'kalin', name: 'Kalın Misina', price: 1400, desc: 'Orta sulara iner', depth: 38, durability: 2 },
  celik: { id: 'celik', name: 'Çelik Misina', price: 4500, desc: 'Büyük balığa dayanır', depth: 70, durability: 3 },
  balina: { id: 'balina', name: 'Balina Misinası', price: 14000, desc: 'Marmara dibine kadar iner; en güçlü oltayla köpekbalığına dayanır', depth: 110, durability: 4, sharkReady: true },
};

export const LINE_ORDER: LineId[] = ['ince', 'orta', 'kalin', 'celik', 'balina'];

export const HOOKS: Record<HookId, Hook> = {
  adi: { id: 'adi', name: 'Adi İğne', price: 0, desc: 'Sadece küçük balıklar ısırır', maxPrice: 8 },
  sert: { id: 'sert', name: 'Sert İğne', price: 4000, desc: 'Orta boy balıklar da ısırır', maxPrice: 22 },
  ozel: { id: 'ozel', name: 'Özel İğne', price: 14000, desc: 'Altın balık ve kalkan da ısırır', maxPrice: 65 },
  usta: { id: 'usta', name: 'Usta İğnesi', price: 38000, desc: 'Fener balığı dahil her balık ısırır', maxPrice: 110 },
};

export const HOOK_ORDER: HookId[] = ['adi', 'sert', 'ozel', 'usta'];

export const BOATS: Record<BoatId, Boat> = {
  sandal: { id: 'sandal', name: 'Sandal', price: 0, desc: 'Küçük kova', capacity: 10 },
  kayik: { id: 'kayik', name: 'Kayık', price: 1000, desc: 'Biraz daha büyük kova', capacity: 16 },
  motor: { id: 'motor', name: 'Motorbot', price: 4000, desc: 'Ferah bir kova', capacity: 24 },
  yat: { id: 'yat', name: 'Yat', price: 13000, desc: 'Büyük kova', capacity: 34 },
  gemi: { id: 'gemi', name: 'Balıkçı Gemisi', price: 35000, desc: 'Devasa kova', capacity: 50 },
};

export const BOAT_ORDER: BoatId[] = ['sandal', 'kayik', 'motor', 'yat', 'gemi'];

export const BAITS: Record<BaitId, Bait> = {
  ekmek: { id: 'ekmek', name: 'Ekmek', icon: '🍞', price: 0, desc: 'Hamsi ve istavrit bayılır', likes: ['hamsi', 'istavrit'] },
  solucan: { id: 'solucan', name: 'Solucan', icon: '🪱', price: 800, desc: 'Çipura, levrek, palyaço', likes: ['cipura', 'levrek', 'palyaco'] },
  karides: { id: 'karides', name: 'Karides', icon: '🦐', price: 3200, desc: 'Lüfer, mezgit, palamut', likes: ['lufer', 'mezgit', 'palamut'] },
  sardalya: { id: 'sardalya', name: 'Sardalya', icon: '🐟', price: 9500, desc: 'Kalkan ve kılıç balığı', likes: ['kalkan', 'kilic'] },
  kalamar: { id: 'kalamar', name: 'Kalamar', icon: '🦑', price: 24000, desc: 'Fener balığı ve altın balık', likes: ['fener', 'altin'] },
};

export const BAIT_ORDER: BaitId[] = ['ekmek', 'solucan', 'karides', 'sardalya', 'kalamar'];

/** Takılı yemlerin sevdiği türlerin birleşimi (tekrarsız); her iğne kendi yemiyle çeker. */
export function unionBaitLikes(ids: BaitId[]): SpeciesId[] {
  return Array.from(new Set(ids.flatMap((id) => BAITS[id].likes)));
}

/** Oltaya takılabilecek en fazla iğne (fiziksel iğne sayısı; kalite kademesinden ayrı). */
export const MAX_HOOK_SLOTS = 3;
/** Yeni bir iğne eklemenin fiyatı (hedef iğne sayısına göre); çok pahalı. */
export const HOOK_SLOT_PRICE: Record<number, number> = { 2: 32000, 3: 95000 };

export const isRodId = (v: unknown): v is RodId => typeof v === 'string' && v in RODS;
export const isBaitId = (v: unknown): v is BaitId => typeof v === 'string' && v in BAITS;
export const isLineId = (v: unknown): v is LineId => typeof v === 'string' && v in LINES;
export const isHookId = (v: unknown): v is HookId => typeof v === 'string' && v in HOOKS;
export const isBoatId = (v: unknown): v is BoatId => typeof v === 'string' && v in BOATS;
