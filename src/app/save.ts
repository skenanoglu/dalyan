import type { BaitId, ModeId, RodId, SpeciesId, Upgrades, ZoneId } from './types';
import { UPGRADE_ORDER, defaultUpgrades, maxLevel } from './upgrades';
import { ZONE_ORDER, isZoneId } from './zones';
import { SPECIES_ORDER } from './species';
import { BAIT_ORDER, ROD_ORDER, isBaitId, isRodId } from './gear';

export const SAVE_KEY = 'dalyan.profil';
export const SAVE_VERSION = 2;

export interface Settings {
  sound: boolean;
  haptics: boolean;
}

export interface LogEntry {
  count: number;
}

export interface Profile {
  v: number;
  money: number;
  upgrades: Upgrades;
  zones: Record<ZoneId, boolean>;
  /** Sahip olunan olta ve yemler, seçili olanlar. */
  rods: Record<RodId, boolean>;
  rod: RodId;
  baits: Record<BaitId, boolean>;
  bait: BaitId;
  lastZone: ZoneId;
  lastMode: ModeId;
  /** Olta için son seçilen zaman: gece mi. */
  night: boolean;
  logbook: Partial<Record<SpeciesId, LogEntry>>;
  settings: Settings;
  stats: { trips: number; totalMoney: number; totalFish: number };
}

const flags = <K extends string>(all: K[], on: K[]): Record<K, boolean> =>
  Object.fromEntries(all.map((k) => [k, on.includes(k)])) as Record<K, boolean>;

export function defaultProfile(): Profile {
  return {
    v: SAVE_VERSION,
    money: 0,
    upgrades: defaultUpgrades(),
    zones: flags(ZONE_ORDER, ['kiyi']),
    rods: flags(ROD_ORDER, ['kamis']),
    rod: 'kamis',
    baits: flags(BAIT_ORDER, ['ekmek']),
    bait: 'ekmek',
    lastZone: 'kiyi',
    lastMode: 'olta',
    night: false,
    logbook: {},
    settings: { sound: true, haptics: true },
    stats: { trips: 0, totalMoney: 0, totalFish: 0 },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const int = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : null;

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

/**
 * Kayıttan profil üretir; bozuk, eksik ya da geçersiz alanlar varsayılana döner.
 * Eski sürümlerden kalan alanlar (ör. pazar bulmacası yükseltmeleri) sessizce atılır.
 */
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
  if (isObj(data.upgrades)) {
    for (const id of UPGRADE_ORDER) p.upgrades[id] = int(data.upgrades[id], 0, maxLevel(id)) ?? 0;
  }
  if (isObj(data.zones)) {
    for (const z of ZONE_ORDER) p.zones[z] = bool(data.zones[z], p.zones[z]);
  }
  p.zones.kiyi = true;
  if (isObj(data.rods)) for (const r of ROD_ORDER) p.rods[r] = bool(data.rods[r], p.rods[r]);
  p.rods.kamis = true;
  if (isRodId(data.rod) && p.rods[data.rod]) p.rod = data.rod;
  if (isObj(data.baits)) for (const b of BAIT_ORDER) p.baits[b] = bool(data.baits[b], p.baits[b]);
  p.baits.ekmek = true;
  if (isBaitId(data.bait) && p.baits[data.bait]) p.bait = data.bait;
  if (typeof data.lastZone === 'string' && isZoneId(data.lastZone) && p.zones[data.lastZone]) {
    p.lastZone = data.lastZone;
  }
  if (data.lastMode === 'olta' || data.lastMode === 'marti') p.lastMode = data.lastMode;
  p.night = bool(data.night, false);
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
