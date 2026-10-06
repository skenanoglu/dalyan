import type { SpeciesId, ZoneId } from '../../app/types';
import { RARE_PRICE, SPECIES, SPECIES_ORDER } from '../../app/species';

export type Mark = 'line' | 'band' | 'stripes' | 'shine' | 'benek' | 'kilic' | 'fener' | 'kalamar' | 'ahtapot';

/** Avda görünen bir canlı türü: pazardaki türler + tehlikeler. */
export interface FishType {
  key: SpeciesId | 'denizanasi';
  /** Kovaya girebilen türse kimliği; tehlikelerde null. */
  species: SpeciesId | null;
  name: string;
  len: number;
  h: number;
  speed: [number, number];
  metre: [number, number];
  weight: number;
  reel: number;
  body: string;
  belly: string;
  fin: string;
  mark?: Mark;
  junk: boolean;
  naylon: boolean;
  joker: boolean;
  rare: boolean;
  hazard?: 'jelly' | 'shark';
  /** Avcı balıklar ara sıra kısa süre hızlanır. */
  dash?: Dash;
}

/** rate: saniyedeki atılım olasılığı, dur: atılım süresi (sn), mult: hız çarpanı. */
export interface Dash {
  rate: number;
  dur: number;
  mult: number;
}

interface Body {
  len: number;
  h: number;
  speed: [number, number];
  reel: number;
  mark?: Mark;
  dash?: Dash;
}

// Boy, hız ve çekiş Balık Avı'nın TYPES tablosundan (BalikAvi/js/veri.js).
// Fiyat, ağırlık, derinlik ve renkler tek kaynaktan: app/species.ts.
const BODY: Record<SpeciesId, Body> = {
  hamsi: { len: 34, h: 11, speed: [120, 170], reel: 1 },
  istavrit: { len: 40, h: 14, speed: [110, 150], reel: 0.95, mark: 'line' },
  cipura: { len: 50, h: 28, speed: [70, 100], reel: 0.85, mark: 'band' },
  palyaco: { len: 38, h: 20, speed: [60, 90], reel: 0.9, mark: 'stripes' },
  levrek: { len: 66, h: 22, speed: [80, 115], reel: 0.7, mark: 'line', dash: { rate: 0.25, dur: 0.7, mult: 1.8 } },
  altin: { len: 40, h: 21, speed: [180, 230], reel: 0.8, mark: 'shine' },
  lufer: { len: 58, h: 24, speed: [100, 140], reel: 0.75, mark: 'line', dash: { rate: 0.3, dur: 0.8, mult: 2 } },
  mezgit: { len: 52, h: 20, speed: [70, 100], reel: 0.8, mark: 'line' },
  palamut: { len: 70, h: 26, speed: [130, 175], reel: 0.65, mark: 'line', dash: { rate: 0.35, dur: 0.8, mult: 2.1 } },
  kalkan: { len: 74, h: 40, speed: [45, 70], reel: 0.55, mark: 'benek' },
  kilic: { len: 96, h: 26, speed: [160, 210], reel: 0.5, mark: 'kilic', dash: { rate: 0.4, dur: 0.9, mult: 2.2 } },
  fener: { len: 62, h: 42, speed: [40, 65], reel: 0.45, mark: 'fener' },
  cizme: { len: 32, h: 36, speed: [25, 40], reel: 0.8 },
  naylon: { len: 38, h: 34, speed: [18, 34], reel: 0.85 },
  pet: { len: 22, h: 44, speed: [14, 28], reel: 0.85 },
  kopekbaligi: { len: 150, h: 46, speed: [140, 180], reel: 0.35, dash: { rate: 0.25, dur: 0.7, mult: 1.7 } },
  // Kalamar mürekkep püskürtür gibi ani fışkırmalarla kaçar; ahtapot yavaş ama oltaya sıkı yapışır.
  kalamar: { len: 58, h: 18, speed: [80, 115], reel: 0.75, mark: 'kalamar', dash: { rate: 0.45, dur: 0.5, mult: 2.4 } },
  ahtapot: { len: 48, h: 42, speed: [35, 55], reel: 0.55, mark: 'ahtapot' },
};

const fromSpecies = (id: SpeciesId): FishType => {
  const s = SPECIES[id];
  const b = BODY[id];
  return {
    key: id,
    species: id,
    name: s.name,
    len: b.len,
    h: b.h,
    speed: b.speed,
    metre: s.depth,
    weight: s.weight,
    reel: b.reel,
    body: s.body,
    belly: s.belly,
    fin: s.fin,
    mark: b.mark,
    dash: b.dash,
    junk: s.junk,
    naylon: id === 'naylon',
    joker: s.joker,
    rare: !s.junk && s.price >= RARE_PRICE,
  };
};

const hazard = (key: 'denizanasi', name: string, rest: Pick<FishType, 'len' | 'h' | 'speed' | 'metre' | 'weight' | 'hazard'>): FishType => ({
  key,
  species: null,
  name,
  reel: 1,
  body: '',
  belly: '',
  fin: '',
  junk: false,
  naylon: false,
  joker: false,
  rare: false,
  ...rest,
});

// Köpekbalığı: pazardaki türlerden biri ama aynı zamanda bir tehlike (bkz. world.ts checkHook).
// En güçlü olta + misina olmadan tutulamaz; oltadaki balığı kapar ya da misinayı koparır.
export const TYPES: FishType[] = [
  ...SPECIES_ORDER.map((id) => (id === 'kopekbaligi' ? { ...fromSpecies(id), hazard: 'shark' as const } : fromSpecies(id))),
  hazard('denizanasi', 'Denizanası', { len: 36, h: 40, speed: [20, 35], metre: [3, 35], weight: 1.3, hazard: 'jelly' }),
];

/** Bölge derinliği (dünya pikseli). Dikey ekranda kıyı en az ekranı dolduracak kadar uzatılır. */
export const ZONE_DEPTH_PX: Record<ZoneId, number> = { kiyi: 380, bogaz: 800, cukur: 1400, marmara: 2100 };
