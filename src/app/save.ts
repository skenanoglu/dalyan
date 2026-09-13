import type { CharacterId, SpeciesId, Upgrades, ZoneId } from './types';
import { UPGRADE_ORDER, defaultUpgrades, maxLevel } from './upgrades';
import { ZONE_ORDER, isZoneId } from './zones';
import { SPECIES_ORDER } from './species';

export const SAVE_KEY = 'dalyan.profil';
export const SAVE_VERSION = 1;

export interface Settings {
  sound: boolean;
  haptics: boolean;
  colorblind: boolean;
}

export interface LogEntry {
  count: number;
}

export interface Profile {
  v: number;
  money: number;
  character: CharacterId;
  upgrades: Upgrades;
  zones: Record<ZoneId, boolean>;
  /** Yolculukla en az bir kez varılmış bölgeler (Hızlı Git için). */
  visited: Record<ZoneId, boolean>;
  lastZone: ZoneId;
  logbook: Partial<Record<SpeciesId, LogEntry>>;
  settings: Settings;
  stats: { trips: number; totalMoney: number; totalFish: number };
}

const zoneFlags = (on: ZoneId[] = []): Record<ZoneId, boolean> =>
  Object.fromEntries(ZONE_ORDER.map((z) => [z, on.includes(z)])) as Record<ZoneId, boolean>;

export function defaultProfile(): Profile {
  return {
    v: SAVE_VERSION,
    money: 0,
    character: 'balik',
    upgrades: defaultUpgrades(),
    zones: zoneFlags(['kiyi']),
    visited: zoneFlags(),
    lastZone: 'kiyi',
    logbook: {},
    settings: { sound: true, haptics: true, colorblind: false },
    stats: { trips: 0, totalMoney: 0, totalFish: 0 },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const int = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : null;

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

/** Kayıttan profil üretir; bozuk, eksik ya da geçersiz alanlar varsayılana döner. */
export function parseProfile(raw: string | null): Profile {
  const p = defaultProfile();
  if (!raw) return p;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return p;
  }
  if (!isObj(data)) return p;

  p.money = int(data.money) ?? 0;
  if (data.character === 'balik' || data.character === 'marti') p.character = data.character;

  if (isObj(data.upgrades)) {
    for (const id of UPGRADE_ORDER) p.upgrades[id] = int(data.upgrades[id], 0, maxLevel(id)) ?? 0;
  }
  if (isObj(data.zones)) {
    for (const z of ZONE_ORDER) p.zones[z] = bool(data.zones[z], p.zones[z]);
  }
  p.zones.kiyi = true;
  if (isObj(data.visited)) {
    for (const z of ZONE_ORDER) p.visited[z] = bool(data.visited[z], false) && p.zones[z];
  }
  if (typeof data.lastZone === 'string' && isZoneId(data.lastZone) && p.zones[data.lastZone]) {
    p.lastZone = data.lastZone;
  }
  if (isObj(data.logbook)) {
    for (const id of SPECIES_ORDER) {
      const entry = data.logbook[id];
      const count = isObj(entry) ? int(entry.count) : null;
      if (count) p.logbook[id] = { count };
    }
  }
  if (isObj(data.settings)) {
    p.settings.sound = bool(data.settings.sound, p.settings.sound);
    p.settings.haptics = bool(data.settings.haptics, p.settings.haptics);
    p.settings.colorblind = bool(data.settings.colorblind, p.settings.colorblind);
  }
  if (isObj(data.stats)) {
    p.stats.trips = int(data.stats.trips) ?? 0;
    p.stats.totalMoney = int(data.stats.totalMoney) ?? 0;
    p.stats.totalFish = int(data.stats.totalFish) ?? 0;
  }
  return p;
}

export function loadProfile(): Profile {
  try {
    return parseProfile(localStorage.getItem(SAVE_KEY));
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(p));
  } catch {
    /* gizli sekme ya da dolu depo: sessizce geç */
  }
}

export function resetProfile(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* yok say */
  }
}
