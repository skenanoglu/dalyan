import type { App } from './app';
import type { HarborOut, TripSummary, WeatherId } from './types';
import { ZONES } from './zones';
import { applyTrip } from './progress';
import { randomSeed } from './rng';
import { rollWeather } from './weather';
import { harborScene } from '../scenes/harbor/scene';
import { fishingScene } from '../scenes/fishing/scene';
import { marketScene } from '../scenes/market/scene';

/** Ana döngü: Liman → Olta → Pazar → Liman … */
export async function runGame(app: App): Promise<void> {
  let lastTrip: TripSummary | undefined;
  let weather = rollWeather();
  for (;;) {
    const choice = await app.show(harborScene, { lastTrip, weather }, 'Karaköy Limanı');
    lastTrip = await runTrip(app, choice, weather);
    weather = rollWeather();
  }
}

export async function runTrip(app: App, choice: HarborOut, weather: WeatherId): Promise<TripSummary> {
  const seed = randomSeed();
  const { rod, baitSlots, line, hook, boat, fishSeconds } = app.profile;
  const out = await app.show(
    fishingScene,
    { zone: choice.zone, rod, baitSlots, line, hook, boat, duration: fishSeconds, weather, night: choice.night, seed },
    `Olta · ${ZONES[choice.zone].name}`,
  );

  const market = await app.show(marketScene, { catch: out.catch, zone: choice.zone }, 'Karaköy Balık Pazarı');
  const { profile, summary } = applyTrip(app.profile, { zone: choice.zone, catch: out.catch, market });
  app.commit(profile);
  return summary;
}
