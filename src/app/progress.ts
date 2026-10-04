import type { BaitId, BoatId, Catch, HookId, LineId, MarketOut, RodId, SaleLine, SpeciesId, TripSummary, ZoneId } from './types';
import type { Profile } from './save';
import { SPECIES, SPECIES_ORDER } from './species';
import { ZONES, ZONE_ORDER } from './zones';
import { BAITS, BAIT_ORDER, BOATS, BOAT_ORDER, HOOKS, HOOK_ORDER, HOOK_SLOT_PRICE, LINES, LINE_ORDER, MAX_HOOK_SLOTS, RODS, ROD_ORDER } from './gear';
import { catchCount } from './catch';
import { checkAchievements } from './achievements';
import { advanceDailyQuests } from './quests';

/** Bir kademe (olta/misina/iğne/tekne/yem) yalnızca bir öncekine sahipsen alınabilir; en ucuz kademe her zaman serbesttir. */
function prevTierOwned<T extends string>(owned: Record<T, boolean>, order: readonly T[], id: T): boolean {
  const i = order.indexOf(id);
  return i <= 0 || owned[order[i - 1]];
}

// ---------- Bölgeler ----------

export function canBuyZone(p: Profile, id: ZoneId): boolean {
  if (p.zones[id]) return false;
  if (!prevTierOwned(p.zones, ZONE_ORDER, id)) return false;
  return p.money >= ZONES[id].price;
}

export function buyZone(p: Profile, id: ZoneId): Profile | null {
  if (!canBuyZone(p, id)) return null;
  const next = structuredClone(p);
  next.money -= ZONES[id].price;
  next.zones[id] = true;
  return next;
}

// ---------- Olta ve yem ----------

export const canBuyRod = (p: Profile, id: RodId): boolean => !p.rods[id] && prevTierOwned(p.rods, ROD_ORDER, id) && p.money >= RODS[id].price;
export const canBuyBait = (p: Profile, id: BaitId): boolean => !p.baits[id] && prevTierOwned(p.baits, BAIT_ORDER, id) && p.money >= BAITS[id].price;

/** Oltayı alır ve hemen eline verir. */
export function buyRod(p: Profile, id: RodId): Profile | null {
  if (!canBuyRod(p, id)) return null;
  const next = structuredClone(p);
  next.money -= RODS[id].price;
  next.rods[id] = true;
  next.rod = id;
  return next;
}

/** Yemi alır; hangi iğneye takılacağı Donanım ekranından seçilir. */
export function buyBait(p: Profile, id: BaitId): Profile | null {
  if (!canBuyBait(p, id)) return null;
  const next = structuredClone(p);
  next.money -= BAITS[id].price;
  next.baits[id] = true;
  return next;
}

/** Bir iğneye (slot) sahip olunan bir yemi takar. */
export function setBaitSlot(p: Profile, slot: number, id: BaitId): Profile | null {
  if (slot < 0 || slot >= p.hookCount || !p.baits[id]) return null;
  const next = structuredClone(p);
  next.baitSlots = [...next.baitSlots];
  next.baitSlots[slot] = id;
  return next;
}

// ---------- Misina, iğne ve tekne ----------

export const canBuyLine = (p: Profile, id: LineId): boolean => !p.lines[id] && prevTierOwned(p.lines, LINE_ORDER, id) && p.money >= LINES[id].price;
export const canBuyHook = (p: Profile, id: HookId): boolean => !p.hooks[id] && prevTierOwned(p.hooks, HOOK_ORDER, id) && p.money >= HOOKS[id].price;
export const canBuyBoat = (p: Profile, id: BoatId): boolean => !p.boats[id] && prevTierOwned(p.boats, BOAT_ORDER, id) && p.money >= BOATS[id].price;

/** Misinayı alır ve hemen takar. */
export function buyLine(p: Profile, id: LineId): Profile | null {
  if (!canBuyLine(p, id)) return null;
  const next = structuredClone(p);
  next.money -= LINES[id].price;
  next.lines[id] = true;
  next.line = id;
  return next;
}

/** İğneyi (kalite kademesi) alır ve hemen takar. */
export function buyHook(p: Profile, id: HookId): Profile | null {
  if (!canBuyHook(p, id)) return null;
  const next = structuredClone(p);
  next.money -= HOOKS[id].price;
  next.hooks[id] = true;
  next.hook = id;
  return next;
}

/** Tekneyi alır ve hemen biner. */
export function buyBoat(p: Profile, id: BoatId): Profile | null {
  if (!canBuyBoat(p, id)) return null;
  const next = structuredClone(p);
  next.money -= BOATS[id].price;
  next.boats[id] = true;
  next.boat = id;
  return next;
}

// ---------- Oltaya ikinci/üçüncü iğne ekleme ----------

/** Oltanın izin verdiği en fazla iğne; ucuz oltalar tek, en pahalısı 3 iğne taşır. */
export function rodHookCapacity(p: Profile): number {
  return Math.min(MAX_HOOK_SLOTS, RODS[p.rod].hookCapacity);
}

/** Elindeki oltanın taşıyabildiği kadarı; fazlası (daha güçlü oltayla alınmış olsa da) devre dışı kalır. */
export function activeBaitSlots(p: Profile): BaitId[] {
  return p.baitSlots.slice(0, rodHookCapacity(p));
}

export function nextHookSlotPrice(p: Profile): number | null {
  if (p.hookCount >= rodHookCapacity(p)) return null;
  return HOOK_SLOT_PRICE[p.hookCount + 1] ?? null;
}

export function canBuyHookSlot(p: Profile): boolean {
  const price = nextHookSlotPrice(p);
  return price !== null && p.money >= price;
}

/** Oltaya çok pahalıya yeni bir iğne (fiziksel slot) ekler; en fazla 3 iğne olur. */
export function buyHookSlot(p: Profile): Profile | null {
  const price = nextHookSlotPrice(p);
  if (price === null || p.money < price) return null;
  const next = structuredClone(p);
  next.money -= price;
  next.hookCount += 1;
  next.baitSlots = [...next.baitSlots, 'ekmek'];
  return next;
}

// ---------- Pazar ----------

/** Farklı tür başına +%10, en fazla ×1.8. */
export const VARIETY_STEP = 0.1;
export const VARIETY_MAX = 1.8;

export function varietyMultiplier(varieties: number): number {
  return Math.min(VARIETY_MAX, 1 + VARIETY_STEP * Math.max(0, varieties - 1));
}

/** Tane fiyatı: tür fiyatı × bölge çarpanı. Çöp cezası çarpansızdır. */
export function unitPrice(id: SpeciesId, zone: ZoneId): number {
  const s = SPECIES[id];
  if (s.price < 0) return s.price;
  return Math.round(s.price * ZONES[zone].priceMultiplier);
}

/** Kovanın pazardaki satışı: türlerin toplamı × çeşit çarpanı − çöp cezası. */
export function sellCatch(c: Catch, zone: ZoneId): MarketOut {
  const lines: SaleLine[] = [];
  let base = 0;
  let penalty = 0;
  let varieties = 0;
  for (const sp of SPECIES_ORDER) {
    const count = c[sp] ?? 0;
    if (count <= 0) continue;
    const price = unitPrice(sp, zone);
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
  zone: ZoneId;
  catch: Catch;
  market: MarketOut;
}

/** Av ve satış sonucunu profile işler. */
export function applyTrip(p: Profile, t: TripInput): { profile: Profile; summary: TripSummary } {
  const next = structuredClone(p);
  const earned = Math.max(0, Math.round(t.market.earned));
  next.money += earned;
  next.lastZone = t.zone;
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

  const { daily, reward: questReward } = advanceDailyQuests(next.daily, { catch: t.catch, earned });
  next.daily = daily;
  next.money += questReward;
  next.stats.totalMoney += questReward;

  const { profile, unlocked } = checkAchievements(next);

  return {
    profile,
    summary: {
      zone: t.zone,
      earned,
      fish: catchCount(t.catch),
      newSpecies,
      newAchievements: unlocked.map((a) => a.id),
      questReward,
    },
  };
}
