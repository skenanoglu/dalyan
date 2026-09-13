import type { App } from './app';
import type { HarborOut, TripSummary } from './types';
import { ZONES } from './zones';
import { upgradeValue } from './upgrades';
import { applyTrip, voyageBonus, voyageTarget } from './progress';
import { randomSeed } from './rng';
import { harborScene } from '../scenes/harbor/scene';
import { voyageScene } from '../scenes/voyage/scene';
import { fishingScene } from '../scenes/fishing/scene';
import { marketScene } from '../scenes/market/scene';

/** Ana döngü: Liman → Sefer → Liman … */
export async function runGame(app: App): Promise<void> {
  let lastTrip: TripSummary | undefined;
  for (;;) {
    const choice = await app.show(harborScene, { lastTrip }, 'Karaköy Limanı');
    lastTrip = await runTrip(app, choice);
  }
}

/** Bir sefer: Yolculuk (ya da Hızlı Git) → Av → Pazar; sonucu profile işler. */
export async function runTrip(app: App, choice: HarborOut): Promise<TripSummary> {
  const zone = ZONES[choice.zone];
  const upgrades = app.profile.upgrades;
  const seed = randomSeed();

  const target = voyageTarget(zone.id, upgrades.motor);
  const voyage = choice.fast
    ? null
    : await app.show(voyageScene, { zone: zone.id, character: app.profile.character, target }, `Yolculuk · ${zone.name}`);

  const bonus = voyageBonus(voyage, target, upgradeValue('durbun', upgrades.durbun));
  const fishing = await app.show(fishingScene, { zone: zone.id, upgrades, seed, ...bonus }, `Av · ${zone.name}`);
  const market = await app.show(marketScene, { catch: fishing.catch, zone: zone.id, upgrades, seed }, 'Karaköy Gece Pazarı');

  const { profile, summary } = applyTrip(app.profile, { zone: zone.id, voyage, fishing, market });
  app.commit(profile);
  return summary;
}
