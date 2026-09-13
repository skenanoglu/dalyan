import { deferred, onAction, type SceneFactory } from '../../app/scene';
import type { FishingIn, FishingOut } from '../../app/types';
import { ZONES } from '../../app/zones';
import { catchCount } from '../../app/catch';
import { catchListHtml } from '../../ui/catch-list';
import { fakeCatch } from './fake';

/** GEÇİCİ: Aşama 2'de yerini gerçek olta oyunu alacak. Sözleşme aynı kalır. */
export const fishingScene: SceneFactory<FishingIn, FishingOut> = (root, input) => {
  const { promise, resolve } = deferred<FishingOut>();
  const caught = fakeCatch(input);
  const zone = ZONES[input.zone];
  const bonus = input.bonusSeconds > 0 ? ` (+${input.bonusSeconds} varış)` : '';

  root.innerHTML = `
    <div class="stub stub-fishing">
      <p class="stub-tag">Taslak · Aşama 2'de gerçek olta oyunu</p>
      <h2>Av</h2>
      <p class="stub-meta">${zone.name}<br>süre ${90 + input.bonusSeconds} sn${bonus} · yem ${input.bait}</p>
      <h4>Kova · ${catchCount(caught)} balık</h4>
      ${catchListHtml(caught)}
      <div class="stub-actions">
        <button class="btn primary" data-act="done">Kovayı Pazara Götür</button>
      </div>
    </div>`;

  let done = false;
  const off = onAction(root, (act) => {
    if (act !== 'done' || done) return;
    done = true;
    resolve({ catch: caught });
  });

  return { done: promise, destroy: off };
};
