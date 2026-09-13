import { deferred, onAction, type SceneFactory } from '../../app/scene';
import type { VoyageIn, VoyageOut } from '../../app/types';
import { ZONES } from '../../app/zones';

/** GEÇİCİ: Aşama 3'te yerini gerçek Boğaz koşusu alacak. Sözleşme aynı kalır. */
export const voyageScene: SceneFactory<VoyageIn, VoyageOut> = (root, input) => {
  const { promise, resolve } = deferred<VoyageOut>();
  const half = Math.floor(input.target / 2);

  root.innerHTML = `
    <div class="stub stub-voyage">
      <p class="stub-tag">Taslak · Aşama 3'te gerçek Boğaz koşusu</p>
      <h2>Yolculuk</h2>
      <p class="stub-meta">${ZONES[input.zone].name}<br>${input.character === 'balik' ? '🐟 Balık' : '🕊️ Martı'} · hedef ${input.target} geçiş</p>
      <div class="stub-actions">
        <button class="btn primary" data-act="end" data-arg="${input.target}:3">Vardım · 3 inci</button>
        <button class="btn" data-act="end" data-arg="${half}:1">Yarı yolda çarptım · 1 inci</button>
        <button class="btn ghost" data-act="end" data-arg="0:0">Hemen çarptım</button>
      </div>
    </div>`;

  let done = false;
  const off = onAction(root, (act, arg) => {
    if (act !== 'end' || done) return;
    done = true;
    const [passed, pearls] = arg.split(':').map(Number);
    resolve({ passed, pearls, arrived: passed >= input.target });
  });

  return { done: promise, destroy: off };
};
