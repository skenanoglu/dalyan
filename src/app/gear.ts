import type { BaitId, BoatId, HookId, LineId, RodId, SpeciesId, TankId } from './types';

/** Olta tipi: ne kadar hızlı indirdiği ve ne kadar hızlı çektiği. Derinliği artık misina belirler. */
export interface Rod {
  id: RodId;
  name: string;
  icon: string;
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
  icon: string;
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
  icon: string;
  price: number;
  desc: string;
  maxPrice: number;
}

/** Tekne: bir seferde kovaya sığacak en fazla balık (çöp dahil). */
export interface Boat {
  id: BoatId;
  name: string;
  icon: string;
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
  kamis: { id: 'kamis', name: 'Kamış Olta', icon: '🎣', price: 0, desc: 'Yavaş iner, yavaş çeker', drop: 190, reel: 1, hookCapacity: 1 },
  bambu: { id: 'bambu', name: 'Bambu Olta', icon: '🪵', price: 400, desc: 'Biraz daha hızlı iner ve çeker', drop: 230, reel: 1.15, hookCapacity: 1 },
  karbon: { id: 'karbon', name: 'Karbon Olta', icon: '⚙️', price: 1400, desc: 'Hafif ve hızlı çekiş; 2 iğne taşır', drop: 280, reel: 1.35, hookCapacity: 2 },
  makarali: { id: 'makarali', name: 'Makaralı Olta', icon: '🌀', price: 4500, desc: 'Büyük balığı çabuk çeker; 2 iğne taşır', drop: 340, reel: 1.6, hookCapacity: 2 },
  derin: {
    id: 'derin',
    name: 'Derin Deniz Oltası',
    icon: '🔱',
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
  ince: { id: 'ince', name: 'İnce Misina', icon: '🧵', price: 0, desc: 'Sığ sularda tutar', depth: 12, durability: 0 },
  orta: { id: 'orta', name: 'Orta Misina', icon: '🧶', price: 400, desc: 'Biraz daha derine iner, biraz daha dayanıklı', depth: 20, durability: 1 },
  kalin: { id: 'kalin', name: 'Kalın Misina', icon: '🪢', price: 1400, desc: 'Orta sulara iner', depth: 38, durability: 2 },
  celik: { id: 'celik', name: 'Çelik Misina', icon: '⛓️', price: 4500, desc: 'Büyük balığa dayanır', depth: 70, durability: 3 },
  balina: { id: 'balina', name: 'Balina Misinası', icon: '🐋', price: 14000, desc: 'Marmara dibine kadar iner; en güçlü oltayla köpekbalığına dayanır', depth: 110, durability: 4, sharkReady: true },
};

export const LINE_ORDER: LineId[] = ['ince', 'orta', 'kalin', 'celik', 'balina'];

// maxPrice yalnızca nadir/pahalı türleri kısıtlar (bkz. species.ts); yaygın türler her iğneyle ısırır.
export const HOOKS: Record<HookId, Hook> = {
  adi: { id: 'adi', name: 'Adi İğne', icon: '🪝', price: 0, desc: 'Yaygın türler ısırır; altın balık ve üstü ısırmaz', maxPrice: 22 },
  sert: { id: 'sert', name: 'Sert İğne', icon: '🔩', price: 4000, desc: 'Altın balık ve kalkan da ısırır', maxPrice: 38 },
  ozel: { id: 'ozel', name: 'Özel İğne', icon: '✨', price: 14000, desc: 'Kılıç balığı da ısırır', maxPrice: 65 },
  usta: { id: 'usta', name: 'Usta İğnesi', icon: '👑', price: 38000, desc: 'Fener balığı dahil her balık ısırır', maxPrice: 110 },
};

export const HOOK_ORDER: HookId[] = ['adi', 'sert', 'ozel', 'usta'];

export const BOATS: Record<BoatId, Boat> = {
  sandal: { id: 'sandal', name: 'Sandal', icon: '🛶', price: 0, desc: 'Küçük kova', capacity: 10 },
  kayik: { id: 'kayik', name: 'Kayık', icon: '🚣', price: 1000, desc: 'Biraz daha büyük kova', capacity: 16 },
  motor: { id: 'motor', name: 'Motorbot', icon: '🚤', price: 4000, desc: 'Ferah bir kova', capacity: 24 },
  yat: { id: 'yat', name: 'Yat', icon: '🛥️', price: 13000, desc: 'Büyük kova', capacity: 34 },
  gemi: { id: 'gemi', name: 'Balıkçı Gemisi', icon: '🚢', price: 35000, desc: 'Devasa kova', capacity: 50 },
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

/** Dalış tüpü: zıpkınla ne kadar derine inileceği, yüzme hızı ve köpekbalığı çarpma cezasını azaltan dayanıklılık. */
export interface Tank {
  id: TankId;
  name: string;
  icon: string;
  price: number;
  desc: string;
  /** En derin dalış noktası (metre). */
  depth: number;
  /** Yüzme hızı (px/sn). */
  speed: number;
  /** 0-3: köpekbalığı çarpma cezasını azaltır. */
  durability: number;
  /** Yalnızca en iyi tüp: zıpkınla köpekbalığı avlanabilir. */
  sharkReady?: boolean;
}

export const TANKS: Record<TankId, Tank> = {
  mini: { id: 'mini', name: 'Mini Tüp', icon: '🫧', price: 1800, desc: 'Sığ sularda kısa dalış', depth: 10, speed: 110, durability: 0 },
  orta: { id: 'orta', name: 'Orta Tüp', icon: '🤿', price: 5500, desc: 'Biraz daha derin ve hızlı', depth: 22, speed: 130, durability: 1 },
  derin: { id: 'derin', name: 'Derin Tüp', icon: '🥽', price: 15000, desc: 'Orta derinliklere iner', depth: 45, speed: 150, durability: 2 },
  teknik: { id: 'teknik', name: 'Teknik Tüp', icon: '🧜', price: 40000, desc: 'Marmara dibine iner; köpekbalığı da zıpkınlanır', depth: 90, speed: 175, durability: 3, sharkReady: true },
};

export const TANK_ORDER: TankId[] = ['mini', 'orta', 'derin', 'teknik'];

/** Zıpkın tek kademedir; dalmak için ayrıca bir tüp gerekir. */
export const HARPOON = { name: 'Zıpkın', icon: '🏹', price: 3000, desc: 'Suya dalıp balığı zıpkınla vurursun; tüp de gerekir' } as const;

export const isTankId = (v: unknown): v is TankId => typeof v === 'string' && v in TANKS;

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
