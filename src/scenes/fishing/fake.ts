import type { Catch, FishingIn } from '../../app/types';
import { Rng } from '../../app/rng';
import { speciesInReach } from '../../app/species';
import { BAITS, BAIT_PULL, RODS } from '../../app/gear';
import { ZONES } from '../../app/zones';

/**
 * Test ve debug için sahte olta avı (pazar sahnesi kova verilmeden açılırsa).
 * Kurallar gerçeğe yakın: oltanın ulaştığı türler, bölge yoğunluğu ve yem.
 */
export function fakeCatch(input: FishingIn): Catch {
  const rng = new Rng((input.seed ^ 0x5eed) | 0);
  const zone = ZONES[input.zone];
  const reach = Math.min(zone.depth, RODS[input.rod].depth);
  const pool = speciesInReach(reach);
  const count = Math.max(4, Math.round(zone.maxFish * rng.range(0.8, 1.2)));
  const likes = new Set(BAITS[input.bait].likes);

  const c: Catch = {};
  for (let i = 0; i < count; i++) {
    const s = rng.weighted(pool, (sp) => sp.weight * (likes.has(sp.id) ? BAIT_PULL : 1));
    c[s.id] = (c[s.id] ?? 0) + 1;
  }
  return c;
}
