import type { BaitId, Catch, MarketOut, ModeId, RodId, SaleLine, SpeciesId, TripSummary, UpgradeId, ZoneId } from './types';
import type { Profile } from './save';
import { SPECIES, SPECIES_ORDER } from './species';
import { ZONES, ZONE_ORDER } from './zones';
import { upgradeCost } from './upgrades';
import { BAITS, RODS } from './gear';
import { catchCount } from './catch';

// ---------- Bölgeler ----------

export function canBuyZone(p: Profile, id: ZoneId): boolean {
  if (p.zones[id]) return false;
  const i = ZONE_ORDER.indexOf(id);
  if (i > 0 && !p.zones[ZONE_ORDER[i - 1]]) return false;
  return p.money >= ZONES[id].price;
}

export function buyZone(p: Profile, id: ZoneId): Profile | null {
  if (!canBuyZone(p, id)) return null;
  const next = structuredClone(p);
  next.money -= ZONES[id].price;
  next.zones[id] = true;
  return next;
}

// ---------- Yükseltmeler ----------

export function canBuyUpgrade(p: Profile, id: UpgradeId): boolean {
  const cost = upgradeCost(id, p.upgrades[id]);
  return cost !== null && p.money >= cost;
}

export function buyUpgrade(p: Profile, id: UpgradeId): Profile | null {
  const cost = upgradeCost(id, p.upgrades[id]);
  if (cost === null || p.money < cost) return null;
  const next = structuredClone(p);
  next.money -= cost;
  next.upgrades[id]++;
  return next;
}

// ---------- Olta ve yem ----------

export const canBuyRod = (p: Profile, id: RodId): boolean => !p.rods[id] && p.money >= RODS[id].price;
export const canBuyBait = (p: Profile, id: BaitId): boolean => !p.baits[id] && p.money >= BAITS[id].price;

/** Oltayı alır ve hemen eline verir. */
export function buyRod(p: Profile, id: RodId): Profile | null {
  if (!canBuyRod(p, id)) return null;
  const next = structuredClone(p);
  next.money -= RODS[id].price;
  next.rods[id] = true;
  next.rod = id;
  return next;
}

/** Yemi alır ve hemen takar. */
export function buyBait(p: Profile, id: BaitId): Profile | null {
  if (!canBuyBait(p, id)) return null;
  const next = structuredClone(p);
  next.money -= BAITS[id].price;
  next.baits[id] = true;
  next.bait = id;
  return next;
}

// ---------- Pazar ----------

/** Farklı tür başına +%10, en fazla ×1.8. */
export const VARIETY_STEP = 0.1;
export const VARIETY_MAX = 1.8;

export function varietyMultiplier(varieties: number): number {
  return Math.min(VARIETY_MAX, 1 + VARIETY_STEP * Math.max(0, varieties - 1));
}

/** Tane fiyatı: tür fiyatı × bölge çarpanı (oltada). Çöp cezası çarpansızdır. */
export function unitPrice(id: SpeciesId, mode: ModeId, zone: ZoneId): number {
  const s = SPECIES[id];
  if (s.price < 0) return s.price;
  const zoneX = mode === 'olta' ? ZONES[zone].priceMultiplier : 1;
  return Math.round(s.price * zoneX);
}

/** Kovanın pazardaki satışı: türlerin toplamı × çeşit çarpanı − çöp cezası. */
export function sellCatch(c: Catch, mode: ModeId, zone: ZoneId): MarketOut {
  const lines: SaleLine[] = [];
  let base = 0;
  let penalty = 0;
  let varieties = 0;
  for (const sp of SPECIES_ORDER) {
    const count = c[sp] ?? 0;
    if (count <= 0) continue;
    const price = unitPrice(sp, mode, zone);
    const total = price * count;
    lines.push({ sp, count, price, total });
    if (total < 0) penalty -= total;
    else {
      base += total;
      varieties++;
    }
  }
  const multiplier = varietyMultiplier(varieties);
  const bonus = Math.round(base * (multiplier - 1));
  return {
    lines,
    base,
    varieties,
    multiplier,
    bonus,
    penalty,
    earned: Math.max(0, base + bonus - penalty),
  };
}

// ---------- Sefer ----------

export interface TripInput {
  mode: ModeId;
  zone: ZoneId;
  catch: Catch;
  market: MarketOut;
}

/** Av ve satış sonucunu profile işler. */
export function applyTrip(p: Profile, t: TripInput): { profile: Profile; summary: TripSummary } {
  const next = structuredClone(p);
  const earned = Math.max(0, Math.round(t.market.earned));
  next.money += earned;
  next.lastMode = t.mode;
  if (t.mode === 'olta') next.lastZone = t.zone;
  next.stats.trips++;
  next.stats.totalMoney += earned;

  const newSpecies: SpeciesId[] = [];
  for (const id of SPECIES_ORDER) {
    const n = t.catch[id] ?? 0;
    if (n <= 0 || SPECIES[id].junk) continue;
    const entry = next.logbook[id];
    if (entry) entry.count += n;
    else {
      next.logbook[id] = { count: n };
      newSpecies.push(id);
    }
    next.stats.totalFish += n;
  }

  return {
    profile: next,
    summary: {
      mode: t.mode,
      zone: t.mode === 'olta' ? t.zone : null,
      earned,
      fish: catchCount(t.catch),
      newSpecies,
    },
  };
}
