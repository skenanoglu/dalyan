import type { SpeciesId, WeatherId } from './types';

/** Olta seferinin havası. */
export interface WeatherDef {
  id: WeatherId;
  name: string;
  icon: string;
  desc: string;
  /** Sefer başında gelme olasılığı. */
  chance: number;
  /** Balık doğma hızı çarpanı. */
  spawnRate: number;
  /** Balık yüzme hızı çarpanı. */
  fishSpeed: number;
  /** Aynı anda en fazla çöp. */
  junkCap: number;
  junkWeight: number;
  sharkWeight: number;
  /** Nadir türlerin görülme ağırlığı çarpanı; fırtınada derin/nadir balıklar daha sık çıkar. */
  rareWeight: number;
  /** Rüzgârın tekneyi itme kuvveti (px/sn²); 0 = sürüklenme yok. */
  drift: number;
  /** Dalganın misinayı savurma genliği (px). */
  hookSway: number;
  /** Saniyedeki yağmur damlası. */
  rain: number;
  /** Gökyüzü ve suyun kararması (0-1). */
  dim: number;
  /** Suyun bulanıklığı (0-1): uzaktaki balıklar zor seçilir. */
  murk: number;
  lightning: boolean;
}

export const WEATHER: Record<WeatherId, WeatherDef> = {
  gunes: {
    id: 'gunes',
    name: 'Güneşli',
    icon: '☀️',
    desc: 'Deniz sakin.',
    chance: 0.55,
    spawnRate: 1,
    fishSpeed: 1,
    junkCap: 2,
    junkWeight: 1,
    sharkWeight: 1,
    rareWeight: 1,
    drift: 0,
    hookSway: 0,
    rain: 0,
    dim: 0,
    murk: 0,
    lightning: false,
  },
  yagmur: {
    id: 'yagmur',
    name: 'Yağmurlu',
    icon: '🌧️',
    desc: 'Balıklar hareketli ama su bulanık.',
    chance: 0.3,
    spawnRate: 1.3,
    fishSpeed: 1.15,
    junkCap: 3,
    junkWeight: 1.3,
    sharkWeight: 1,
    rareWeight: 1.2,
    drift: 0,
    hookSway: 6,
    rain: 90,
    dim: 0.25,
    murk: 0.25,
    lightning: false,
  },
  firtina: {
    id: 'firtina',
    name: 'Fırtına',
    icon: '⛈️',
    desc: 'Tekne sürüklenir, olta savrulur, çöp ve köpekbalığı artar.',
    chance: 0.15,
    spawnRate: 1.2,
    fishSpeed: 1.25,
    junkCap: 4,
    junkWeight: 2,
    sharkWeight: 1.6,
    rareWeight: 1.8,
    drift: 380,
    hookSway: 22,
    rain: 220,
    dim: 0.45,
    murk: 0.35,
    lightning: true,
  },
};

export const WEATHER_ORDER: WeatherId[] = ['gunes', 'yagmur', 'firtina'];

export const isWeatherId = (v: unknown): v is WeatherId => typeof v === 'string' && v in WEATHER;

/** Olasılıklara göre sefer havası seçer. */
export function rollWeather(random: () => number = Math.random): WeatherId {
  let r = random();
  for (const id of WEATHER_ORDER) {
    r -= WEATHER[id].chance;
    if (r < 0) return id;
  }
  return 'gunes';
}

/** Gece: karanlıkta fenerin çevresi görünür, bazı türler sığa çıkıp daha sık görünür. */
export const NIGHT = {
  name: 'Gece',
  icon: '🌙',
  desc: 'Karanlıkta sadece fenerin çevresi görünür; levrek, lüfer, kalkan, kalamar ve fener balığı hareketlenir.',
  darkness: 0.78,
  /** Oltanın ve teknenin feneri (px). */
  hookLight: 150,
  boatLight: 120,
  likes: ['levrek', 'lufer', 'kalkan', 'kalamar', 'fener'] as SpeciesId[],
  dislikes: ['hamsi', 'palyaco', 'cipura'] as SpeciesId[],
  likeX: 1.7,
  dislikeX: 0.6,
  /** Fener balığı gece bu metreye kadar sığa çıkar. */
  fenerRise: 40,
};
