import type { App } from './app';
import type { ModeId, ZoneId } from './types';
import { deferred, onAction, type SceneFactory } from './scene';
import { isZoneId } from './zones';
import { parseCatch } from './catch';
import { randomSeed } from './rng';
import { harborScene } from '../scenes/harbor/scene';
import { fishingScene } from '../scenes/fishing/scene';
import { gullScene } from '../scenes/gull/scene';
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
 * `?sahne=liman|olta|marti|pazar` ile tek bir sahneyi açar.
 * Ek parametreler: bolge, seed, mod=olta|marti, kova=hamsi:8,lufer:3
 */
export function startDebugScene(app: App, params: URLSearchParams): boolean {
  const name = params.get('sahne');
  if (!name) return false;

  const rawZone = params.get('bolge') ?? '';
  const zone: ZoneId = isZoneId(rawZone) ? rawZone : 'kiyi';
  const seed = Number(params.get('seed')) || randomSeed();
  const mode: ModeId = params.get('mod') === 'marti' ? 'marti' : 'olta';
  const upgrades = app.profile.upgrades;

  const runners: Record<string, () => Promise<unknown>> = {
    liman: () => app.show(harborScene, {}, 'Liman'),
    olta: () => app.show(fishingScene, { zone, rod: app.profile.rod, bait: app.profile.bait, seed }, 'Olta'),
    marti: () => app.show(gullScene, { upgrades, seed }, 'Martı'),
    pazar: () => {
      const caught = parseCatch(params.get('kova')) ?? fakeCatch({ zone, rod: app.profile.rod, bait: app.profile.bait, seed });
      return app.show(marketScene, { catch: caught, mode, zone }, 'Pazar');
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
