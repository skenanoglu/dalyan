import type { App } from './app';
import type { Catch, HarborOut, TripSummary } from './types';
import { ZONES } from './zones';
import { applyTrip } from './progress';
import { randomSeed } from './rng';
import { harborScene } from '../scenes/harbor/scene';
import { fishingScene } from '../scenes/fishing/scene';
import { gullScene } from '../scenes/gull/scene';
import { marketScene } from '../scenes/market/scene';

/** Ana döngü: Liman → Av (olta ya da martı) → Pazar → Liman … */
export async function runGame(app: App): Promise<void> {
  let lastTrip: TripSummary | undefined;
  for (;;) {
    const choice = await app.show(harborScene, { lastTrip }, 'Karaköy Limanı');
    lastTrip = await runTrip(app, choice);
  }
}

export async function runTrip(app: App, choice: HarborOut): Promise<TripSummary> {
  const upgrades = app.profile.upgrades;
  const seed = randomSeed();

  let caught: Catch;
  if (choice.mode === 'olta') {
    const { rod, bait } = app.profile;
    const out = await app.show(fishingScene, { zone: choice.zone, rod, bait, seed }, `Olta · ${ZONES[choice.zone].name}`);
    caught = out.catch;
  } else {
    const out = await app.show(gullScene, { upgrades, seed }, 'Martı · Boğaz');
    caught = out.catch;
  }

  const market = await app.show(marketScene, { catch: caught, mode: choice.mode, zone: choice.zone }, 'Karaköy Balık Pazarı');
  const { profile, summary } = applyTrip(app.profile, { mode: choice.mode, zone: choice.zone, catch: caught, market });
  app.commit(profile);
  return summary;
}
