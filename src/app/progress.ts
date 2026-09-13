import type { FishingOut, MarketOut, SpeciesId, TripSummary, VoyageOut, ZoneId } from './types';
import type { Profile } from './save';
import { SPECIES, SPECIES_ORDER } from './species';
import { ZONES, ZONE_ORDER } from './zones';
import { upgradeValue } from './upgrades';
import { catchCount } from './catch';

/** Yolculukta tam varışın avda kazandırdığı ek süre. */
export const FULL_ARRIVAL_SECONDS = 15;

export function voyageTarget(zone: ZoneId, motorLevel: number): number {
  return Math.max(3, Math.round(ZONES[zone].voyageTarget * upgradeValue('motor', motorLevel)));
}

/** Yolculuk sonucunu av bonusuna çevirir. Hızlı Git (null) bonus vermez. */
export function voyageBonus(out: VoyageOut | null, target: number, durbun = 1): { bonusSeconds: number; bait: number } {
  if (!out || target <= 0) return { bonusSeconds: 0, bait: 0 };
  const ratio = Math.max(0, Math.min(1, out.passed / target));
  return {
    bonusSeconds: Math.round(FULL_ARRIVAL_SECONDS * ratio * durbun),
    bait: Math.max(0, Math.floor(out.pearls)),
  };
}

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

/** Bir balığın değeri: tür fiyatı × bölge çarpanı × Kova. Pazarda parçanın kasalarına bölünür. Çöp cezası çarpansızdır. */
export function fishValue(id: SpeciesId, zone: ZoneId, kovaLevel: number): number {
  const s = SPECIES[id];
  if (s.price < 0) return s.price;
  return Math.round(s.price * ZONES[zone].priceMultiplier * upgradeValue('kova', kovaLevel));
}

export interface TripInput {
  zone: ZoneId;
  voyage: VoyageOut | null;
  fishing: FishingOut;
  market: MarketOut;
}

/** Seferin sonucunu profile işler. Bir sefer asla para kaybettirmez. */
export function applyTrip(p: Profile, t: TripInput): { profile: Profile; summary: TripSummary } {
  const next = structuredClone(p);
  const earned = Math.max(0, Math.round(t.market.earned));
  next.money += earned;
  next.lastZone = t.zone;
  next.stats.trips++;
  next.stats.totalMoney += earned;
  if (t.voyage?.arrived) next.visited[t.zone] = true;

  const newSpecies: SpeciesId[] = [];
  for (const id of SPECIES_ORDER) {
    const n = t.fishing.catch[id] ?? 0;
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
      zone: t.zone,
      earned,
      fish: catchCount(t.fishing.catch),
      newSpecies,
      arrived: t.voyage ? t.voyage.arrived : null,
    },
  };
}
