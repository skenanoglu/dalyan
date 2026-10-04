import type { App } from './app';
import type { ZoneId } from './types';
import { deferred, onAction, type SceneFactory } from './scene';
import { isZoneId } from './zones';
import { parseCatch } from './catch';
import { randomSeed } from './rng';
import { isWeatherId, rollWeather } from './weather';
import { activeBaitSlots } from './progress';
import { harborScene } from '../scenes/harbor/scene';
import { fishingScene } from '../scenes/fishing/scene';
import { marketScene } from '../scenes/market/scene';
import { fakeCatch } from '../scenes/fishing/fake';

/** Sahnenin çıktısını gösterir; "Tekrar" ile aynı sahne yeniden açılır. */
const resultScene: SceneFactory<{ name: string; out: unknown }, void> = (root, input) => {
  const { promise, resolve } = deferred<void>();
  root.innerHTML = `
    <div class="stub">
      <p class="stub-tag">Debug · ?sahne=${input.name}</p>
      <h2>Sahne sonucu</h2>
      <pre class="debug-out">${JSON.stringify(input.out, null, 2)}</pre>
      <div class="stub-actions"><button class="btn primary" data-act="again">Tekrar</button></div>
    </div>`;
  const off = onAction(root, (act) => {
    if (act === 'again') resolve();
  });
  return { done: promise, destroy: off };
};

/**
 * `?sahne=liman|olta|pazar` ile tek bir sahneyi açar.
 * Ek parametreler: bolge, seed, hava=gunes|yagmur|firtina, gece=1, kova=hamsi:8,lufer:3, mod=zipkin (olta sahnesinde dalış)
 */
export function startDebugScene(app: App, params: URLSearchParams): boolean {
  const name = params.get('sahne');
  if (!name) return false;

  const rawZone = params.get('bolge') ?? '';
  const zone: ZoneId = isZoneId(rawZone) ? rawZone : 'kiyi';
  const seed = Number(params.get('seed')) || randomSeed();
  const rawWeather = params.get('hava');
  const weather = isWeatherId(rawWeather) ? rawWeather : rollWeather();
  const night = params.get('gece') === '1';

  const runners: Record<string, () => Promise<unknown>> = {
    liman: () => app.show(harborScene, { weather }, 'Liman'),
    olta: () =>
      app.show(
        fishingScene,
        {
          zone,
          rod: app.profile.rod,
          baitSlots: activeBaitSlots(app.profile),
          line: app.profile.line,
          hook: app.profile.hook,
          boat: app.profile.boat,
          mode: params.get('mod') === 'zipkin' ? 'zipkin' : 'olta',
          tank: app.profile.tank,
          harpoonLevel: app.profile.harpoonLevel,
          duration: app.profile.fishSeconds,
          weather,
          night,
          seed,
        },
        'Olta',
      ),
    pazar: () => {
      const caught =
        parseCatch(params.get('kova')) ??
        fakeCatch({ zone, rod: app.profile.rod, baitSlots: activeBaitSlots(app.profile), line: app.profile.line, weather, night, seed });
      return app.show(marketScene, { catch: caught, zone }, 'Pazar');
    },
  };

  const run = runners[name];
  if (!run) return false;
  void (async () => {
    for (;;) {
      const out = await run();
      await app.show(resultScene, { name, out }, 'Sonuç');
    }
  })();
  return true;
}
