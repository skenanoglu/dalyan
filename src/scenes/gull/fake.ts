import type { Catch, GullIn } from '../../app/types';
import { Rng } from '../../app/rng';
import { gullReach } from '../../app/species';
import { upgradeValue } from '../../app/upgrades';

/**
 * GEÇİCİ: Martı oyunu (Boğaz) taşınana kadar sahte uçuş sonucu üretir.
 * Kurallar gerçeğe yakın: dalışın ulaştığı türler; gaga, nefes ve simit etkili.
 */
export function fakeGullCatch(input: GullIn): { catch: Catch; passed: number } {
  const u = input.upgrades;
  const rng = new Rng((input.seed ^ 0x9a11) | 0);
  const nefes = upgradeValue('nefes', u.nefes);
  const gaga = upgradeValue('gaga', u.gaga);
  const dalis = upgradeValue('dalis', u.dalis);
  const simit = upgradeValue('simit', u.simit);

  const passed = Math.round(rng.range(8, 20) * (0.8 + nefes / 7.5) + simit * 6);
  const count = Math.max(2, Math.round(passed * 0.45 * (gaga / 16)));
  // Dalış yükseltmesi derindeki büyük balıkları açar.
  const pool = gullReach(dalis);

  const c: Catch = {};
  for (let i = 0; i < count; i++) {
    const s = rng.weighted(pool, (sp) => sp.weight);
    c[s.id] = (c[s.id] ?? 0) + 1;
  }
  return { catch: c, passed };
}
