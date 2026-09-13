import type { Catch, FishingIn } from '../../app/types';
import { Rng } from '../../app/rng';
import { RARE_PRICE, speciesInReach } from '../../app/species';
import { ZONES } from '../../app/zones';
import { upgradeValue } from '../../app/upgrades';

/**
 * GEÇİCİ: Aşama 2'deki gerçek olta oyunu gelene kadar sahte av üretir.
 * Kurallar gerçeğe yakın: oltanın ulaştığı türler, bölge yoğunluğu, ek süre ve yem.
 */
export function fakeCatch(input: FishingIn): Catch {
  const rng = new Rng((input.seed ^ 0x5eed) | 0);
  const zone = ZONES[input.zone];
  const reach = Math.min(zone.depth, upgradeValue('misina', input.upgrades.misina));
  const pool = speciesInReach(reach);
  const seconds = 90 + input.bonusSeconds;
  const count = Math.max(4, Math.round(zone.maxFish * (seconds / 90) * rng.range(0.8, 1.2)));
  const rareBoost = 1 + 0.15 * input.bait;

  const c: Catch = {};
  for (let i = 0; i < count; i++) {
    const s = rng.weighted(pool, (sp) => sp.weight * (sp.price >= RARE_PRICE ? rareBoost : 1));
    c[s.id] = (c[s.id] ?? 0) + 1;
  }
  return c;
}
