import type { BaitId, BoatId, HookId, LineId, RodId, SpeciesId, ZoneId } from './types';
import { ZONE_ORDER, isZoneId } from './zones';
import { SPECIES_ORDER } from './species';
import { BAIT_ORDER, BOAT_ORDER, HOOK_ORDER, LINE_ORDER, ROD_ORDER, isBaitId, isBoatId, isHookId, isLineId, isRodId } from './gear';

export const SAVE_KEY = 'dalyan.profil';
export const SAVE_VERSION = 4;

/** Balık tutma sahnesinde seçilebilecek av süreleri (sn). */
export const FISH_SECONDS_OPTIONS = [15, 30, 45, 60, 90] as const;
const DEFAULT_FISH_SECONDS = 90;

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
  zones: Record<ZoneId, boolean>;
  /** Sahip olunan olta, misina, iğne, yem ve tekneler; seçili olanlar. */
  rods: Record<RodId, boolean>;
  rod: RodId;
  lines: Record<LineId, boolean>;
  line: LineId;
  hooks: Record<HookId, boolean>;
  hook: HookId;
  baits: Record<BaitId, boolean>;
  bait: BaitId;
  boats: Record<BoatId, boolean>;
  boat: BoatId;
  /** Son seçilen av süresi (sn). */
  fishSeconds: number;
  lastZone: ZoneId;
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
    zones: flags(ZONE_ORDER, ['kiyi']),
    rods: flags(ROD_ORDER, ['kamis']),
    rod: 'kamis',
    lines: flags(LINE_ORDER, ['ince']),
    line: 'ince',
    hooks: flags(HOOK_ORDER, ['adi']),
    hook: 'adi',
    baits: flags(BAIT_ORDER, ['ekmek']),
    bait: 'ekmek',
    boats: flags(BOAT_ORDER, ['sandal']),
    boat: 'sandal',
    fishSeconds: DEFAULT_FISH_SECONDS,
    lastZone: 'kiyi',
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
  if (isObj(data.zones)) {
    for (const z of ZONE_ORDER) p.zones[z] = bool(data.zones[z], p.zones[z]);
  }
  p.zones.kiyi = true;
  if (isObj(data.rods)) for (const r of ROD_ORDER) p.rods[r] = bool(data.rods[r], p.rods[r]);
  p.rods.kamis = true;
  if (isRodId(data.rod) && p.rods[data.rod]) p.rod = data.rod;
  if (isObj(data.lines)) for (const l of LINE_ORDER) p.lines[l] = bool(data.lines[l], p.lines[l]);
  p.lines.ince = true;
  if (isLineId(data.line) && p.lines[data.line]) p.line = data.line;
  if (isObj(data.hooks)) for (const h of HOOK_ORDER) p.hooks[h] = bool(data.hooks[h], p.hooks[h]);
  p.hooks.adi = true;
  if (isHookId(data.hook) && p.hooks[data.hook]) p.hook = data.hook;
  if (isObj(data.baits)) for (const b of BAIT_ORDER) p.baits[b] = bool(data.baits[b], p.baits[b]);
  p.baits.ekmek = true;
  if (isBaitId(data.bait) && p.baits[data.bait]) p.bait = data.bait;
  if (isObj(data.boats)) for (const bt of BOAT_ORDER) p.boats[bt] = bool(data.boats[bt], p.boats[bt]);
  p.boats.sandal = true;
  if (isBoatId(data.boat) && p.boats[data.boat]) p.boat = data.boat;
  p.fishSeconds = (FISH_SECONDS_OPTIONS as readonly number[]).includes(data.fishSeconds as number)
    ? (data.fishSeconds as number)
    : DEFAULT_FISH_SECONDS;
  if (typeof data.lastZone === 'string' && isZoneId(data.lastZone) && p.zones[data.lastZone]) {
    p.lastZone = data.lastZone;
  }
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
