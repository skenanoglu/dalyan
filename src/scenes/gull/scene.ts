import { deferred, onAction, type SceneFactory } from '../../app/scene';
import type { GullIn, GullOut } from '../../app/types';
import { catchCount } from '../../app/catch';
import { catchListHtml } from '../../ui/catch-list';
import { fakeGullCatch } from './fake';

/** GEÇİCİ: Boğaz'daki martı oyunu taşınınca yerini gerçek oyuna bırakacak. Sözleşme aynı kalır. */
export const gullScene: SceneFactory<GullIn, GullOut> = (root, input) => {
  const { promise, resolve } = deferred<GullOut>();
  const result = fakeGullCatch(input);

  root.innerHTML = `
    <div class="stub stub-gull">
      <p class="stub-tag">Taslak · martı oyunu bir sonraki adımda gelecek</p>
      <h2>Martı</h2>
      <p class="stub-meta">Boğaz'da uç, pike yapıp suya dal, yüzeydeki balıkları kap.</p>
      <div data-el="result" hidden>
        <h4>${result.passed} engel geçtin · ${catchCount(result.catch)} balık</h4>
        ${catchListHtml(result.catch)}
      </div>
      <div class="stub-actions">
        <button class="btn primary" data-act="fly">Uç (simülasyon)</button>
      </div>
    </div>`;

  let flown = false;
  let done = false;
  const off = onAction(root, (act, _arg, btn) => {
    if (act === 'fly' && !flown) {
      flown = true;
      (root.querySelector('[data-el="result"]') as HTMLElement).hidden = false;
      btn.textContent = 'Kovayı Pazara Götür';
      btn.dataset.act = 'done';
    } else if (act === 'done' && !done) {
      done = true;
      resolve(result);
    }
  });

  return { done: promise, destroy: off };
};
