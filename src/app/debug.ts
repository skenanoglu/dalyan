import type { App } from './app';
import type { ZoneId } from './types';
import { deferred, onAction, type SceneFactory } from './scene';
import { isZoneId } from './zones';
import { parseCatch } from './catch';
import { voyageTarget } from './progress';
import { randomSeed } from './rng';
import { harborScene } from '../scenes/harbor/scene';
import { voyageScene } from '../scenes/voyage/scene';
import { fishingScene } from '../scenes/fishing/scene';
import { marketScene } from '../scenes/market/scene';
import { fakeCatch } from '../scenes/fishing/fake';

const num = (v: string | null, fallback: number): number => {
  const n = Number(v);
  return v !== null && Number.isFinite(n) ? n : fallback;
};

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
 * `?sahne=liman|yolculuk|av|pazar` ile tek bir sahneyi açar.
 * Ek parametreler: bolge, hedef, bonus, yem, seed, kova=hamsi:8,lufer:3
 */
export function startDebugScene(app: App, params: URLSearchParams): boolean {
  const name = params.get('sahne');
  if (!name) return false;

  const rawZone = params.get('bolge') ?? '';
  const zone: ZoneId = isZoneId(rawZone) ? rawZone : 'kiyi';
  const seed = num(params.get('seed'), randomSeed());
  const p = app.profile;

  const runners: Record<string, () => Promise<unknown>> = {
    liman: () => app.show(harborScene, {}, 'Liman'),
    yolculuk: () =>
      app.show(
        voyageScene,
        { zone, character: p.character, target: num(params.get('hedef'), voyageTarget(zone, p.upgrades.motor)) },
        'Yolculuk',
      ),
    av: () =>
      app.show(
        fishingScene,
        { zone, upgrades: p.upgrades, seed, bonusSeconds: num(params.get('bonus'), 0), bait: num(params.get('yem'), 0) },
        'Av',
      ),
    pazar: () => {
      const caught =
        parseCatch(params.get('kova')) ?? fakeCatch({ zone, upgrades: p.upgrades, seed, bonusSeconds: 0, bait: 0 });
      return app.show(marketScene, { catch: caught, zone, upgrades: p.upgrades, seed }, 'Pazar');
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
