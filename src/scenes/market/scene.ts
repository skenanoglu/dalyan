import './market.css';
import { deferred, onAction, type SceneFactory } from '../../app/scene';
import type { Catch, MarketIn, MarketOut, SpeciesId } from '../../app/types';
import { SPECIES } from '../../app/species';
import { ZONES } from '../../app/zones';
import { MODE_NAMES } from '../../app/modes';
import { VARIETY_MAX, sellCatch, varietyMultiplier } from '../../app/progress';
import { money, signedMoney } from '../../app/format';

const times = (v: number): string => `×${v.toFixed(1)}`;

/** Kedinin gelme olasılığı ve hedefe varma süresi. */
const CAT_CHANCE = 0.7;
const CAT_WALK_MS = 2600;

/** Kedinin hedefi: en değerli balık satırı. */
export function catTarget(sale: MarketOut): SpeciesId | null {
  const fish = sale.lines.filter((l) => l.total > 0);
  if (fish.length === 0) return null;
  return fish.reduce((a, b) => (b.price > a.price ? b : a)).sp;
}

/** Kedi bir balık çalınca kalan kova. */
export function afterTheft(c: Catch, sp: SpeciesId): Catch {
  const next = { ...c };
  const n = (next[sp] ?? 0) - 1;
  if (n > 0) next[sp] = n;
  else delete next[sp];
  return next;
}

/** Karaköy Balık Pazarı: kova türlerine göre satılır, çeşit arttıkça kazanç çarpanı büyür. Kedi fırsat kollar. */
export const marketScene: SceneFactory<MarketIn, MarketOut> = (root, input) => {
  const { promise, resolve } = deferred<MarketOut>();
  const where = input.mode === 'olta' ? `${MODE_NAMES.olta} · ${ZONES[input.zone].name}` : `${MODE_NAMES.marti} · Boğaz`;
  let caught: Catch = { ...input.catch };
  let sale = sellCatch(caught, input.mode, input.zone);
  const timers: number[] = [];
  let raf = 0;
  let catState: 'none' | 'walking' | 'gone' = 'none';

  const receipt = (animate: boolean): string => {
    const rows = sale.lines
      .map((l, i) => {
        const s = SPECIES[l.sp];
        return `
          <li class="${l.total < 0 ? 'junk' : ''}" data-sp="${l.sp}" style="--i:${animate ? i : 0}">
            <i style="--c:${s.color}"></i>
            <span>${s.name}<small>${l.count} × ${money(Math.abs(l.price))}</small></span>
            <b>${signedMoney(l.total)}</b>
          </li>`;
      })
      .join('');
    const next = varietyMultiplier(sale.varieties + 1);
    const tip =
      sale.varieties === 0
        ? 'Kova boş kaldı. Bir dahaki sefere!'
        : sale.multiplier < VARIETY_MAX
          ? `Bir çeşit daha getirseydin çarpan ${times(next)} olurdu.`
          : 'En yüksek çeşit bonusu! Tebrikler.';
    const d = animate ? sale.lines.length : 0;
    return `
      ${rows ? `<ul class="receipt">${rows}</ul>` : '<p class="bz-empty">Tezgâh boş.</p>'}
      <div class="bz-totals" style="--i:${d}">
        <span>Balıklar</span><b>${money(sale.base)}</b>
        <span>Çeşit bonusu <small>${sale.varieties} tür · ${times(sale.multiplier)}</small></span><b class="pos">+${money(sale.bonus)}</b>
        ${sale.penalty > 0 ? `<span>Çöp cezası</span><b class="neg">−${money(sale.penalty)}</b>` : ''}
        <span class="total">Kazanç</span><b class="total" data-el="earned">${money(animate ? 0 : sale.earned)}</b>
      </div>
      <p class="bz-tip" style="--i:${d + 1}">${tip}</p>`;
  };

  root.innerHTML = `
    <div class="bazaar">
      <header class="bz-head">
        <h2>Karaköy Balık Pazarı</h2>
        <p>${where}</p>
      </header>
      <div class="bz-body" data-el="body">${receipt(true)}</div>
      <p class="bz-cat-note" data-el="note" hidden></p>
      <button class="btn primary bz-done" data-act="done" style="--i:${sale.lines.length + 1}">Limana Dön</button>
      <button class="bz-cat" data-act="shoo" aria-label="Kediyi kovala" hidden>🐈</button>
    </div>`;

  const el = (name: string): HTMLElement => root.querySelector(`[data-el="${name}"]`) as HTMLElement;
  const doneBtn = root.querySelector('[data-act="done"]') as HTMLButtonElement;
  const cat = root.querySelector('.bz-cat') as HTMLButtonElement;

  const countUp = (from: number, delay: number): void => {
    const earnedEl = el('earned');
    const startAt = performance.now() + delay;
    cancelAnimationFrame(raf);
    const step = (now: number): void => {
      const k = Math.max(0, Math.min(1, (now - startAt) / 900));
      earnedEl.textContent = money(from + (sale.earned - from) * (1 - (1 - k) ** 3));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  countUp(0, sale.lines.length * 90 + 250);

  const note = (text: string): void => {
    const n = el('note');
    n.textContent = text;
    n.hidden = false;
  };

  // ---------- Kedi ----------
  const target = catTarget(sale);
  const startCat = (): void => {
    if (!target) return;
    const row = root.querySelector<HTMLElement>(`li[data-sp="${target}"]`);
    if (!row) return;
    catState = 'walking';
    doneBtn.disabled = true;
    const box = root.querySelector('.bazaar') as HTMLElement;
    const rowTop = row.offsetTop + row.offsetHeight / 2 - 22;
    cat.style.top = `${rowTop}px`;
    cat.style.left = '-56px';
    cat.hidden = false;
    note(`🐈 Bir kedi ${SPECIES[target].name} kokusunu aldı! Dokun, kovala!`);
    // Bir kare sonra hedefe yürümeye başlasın ki geçiş animasyonu çalışsın.
    requestAnimationFrame(() => {
      cat.style.transition = `left ${CAT_WALK_MS}ms linear`;
      cat.style.left = `${Math.max(40, box.clientWidth - 90)}px`;
    });
    timers.push(
      window.setTimeout(() => {
        if (catState !== 'walking') return;
        catState = 'gone';
        caught = afterTheft(caught, target);
        const before = sale.earned;
        sale = sellCatch(caught, input.mode, input.zone);
        el('body').classList.add('still');
        el('body').innerHTML = receipt(false);
        countUp(before, 0);
        cat.classList.add('run');
        note(`Kedi 1 ${SPECIES[target].name} kaptı ve kaçtı!`);
        doneBtn.disabled = false;
        timers.push(window.setTimeout(() => (cat.hidden = true), 700));
      }, CAT_WALK_MS),
    );
  };
  if (target && Math.random() < CAT_CHANCE) {
    timers.push(window.setTimeout(startCat, sale.lines.length * 90 + 900));
  }

  let done = false;
  const off = onAction(root, (act) => {
    if (act === 'shoo' && catState === 'walking') {
      catState = 'gone';
      const left = cat.getBoundingClientRect().left - (root.querySelector('.bazaar') as HTMLElement).getBoundingClientRect().left;
      cat.style.transition = 'none';
      cat.style.left = `${left}px`;
      cat.classList.add('shoo');
      note('Kediyi kovaladın, balıklar güvende!');
      doneBtn.disabled = false;
      timers.push(window.setTimeout(() => (cat.hidden = true), 600));
    } else if (act === 'done' && !done && catState !== 'walking') {
      done = true;
      resolve(sale);
    }
  });

  return {
    done: promise,
    destroy: () => {
      cancelAnimationFrame(raf);
      for (const t of timers) window.clearTimeout(t);
      off();
    },
  };
};
