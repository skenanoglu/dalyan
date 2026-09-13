import type { MarketOut, SpeciesId } from '../../app/types';
import { SPECIES } from '../../app/species';
import { money } from '../../app/format';
import type { CloseReason, PowerId } from './core/types';
import { ENERGY_PER_CHARGE, MAX_CHARGES, POWER_COST, charges } from './core/rules';
import type { Mode } from './input';

export type Panel = 'rescue' | 'confirm' | 'swap' | 'summary';

const REASON: Record<CloseReason, string> = {
  empty: 'Bant bitti. Tezgâhta kalanlar akşam indirimiyle satıldı.',
  stuck: 'Tezgâhta yer kalmadı. Kalanlar akşam indirimiyle satıldı.',
  manual: 'Pazarı erken kapattın. Kalanlar akşam indirimiyle satıldı.',
};

const POWERS: [PowerId, string, string][] = [
  ['cat', '🐈', 'Kedi'],
  ['swap', '🔁', 'Takas'],
  ['shuffle', '🔀', 'Karıştır'],
];

/** Pazar sahnesinin DOM katmanı: üst bilgi, güçler ve paneller. Tıklamalar `data-act` ile sahneye gider. */
export class Hud {
  readonly canvas: HTMLCanvasElement;
  readonly stage: HTMLElement;
  private toastTimer = 0;

  constructor(private root: HTMLElement) {
    root.innerHTML = `
      <div class="market">
        <header class="m-top">
          <div class="m-earn"><b data-el="earn">₺ 0</b><small data-el="left"></small></div>
          <div class="m-combo" data-el="combo" hidden></div>
          <button class="m-close-btn" data-act="ask-close">Pazarı Kapat</button>
        </header>
        <div class="m-stage" data-el="stage">
          <canvas></canvas>
          <div class="m-toast" data-el="toast" hidden></div>
        </div>
        <footer class="m-bottom">
          <div class="m-energy" data-el="energy">${'<i></i>'.repeat(MAX_CHARGES)}</div>
          <div class="m-powers">
            ${POWERS.map(([id, icon, name]) => `<button class="m-power" data-act="power" data-arg="${id}"><span>${icon}</span>${name}<em>${POWER_COST[id]}</em></button>`).join('')}
          </div>
        </footer>
        <div class="m-overlay" data-el="overlay" hidden>
          <div class="m-panel" data-panel="rescue" hidden>
            <h3>Tezgâhta yer kalmadı!</h3>
            <p>Kalabalık hâlâ burada: kedi bir kasayı kapsın ya da bandı karıştır.</p>
            <button class="btn primary" data-act="use-power">Güç Kullan</button>
            <button class="btn ghost" data-act="confirm-close">Pazarı Kapat</button>
          </div>
          <div class="m-panel" data-panel="confirm" hidden>
            <h3>Pazar kapansın mı?</h3>
            <p>Tezgâhta ve bantta kalan balıklar akşam indirimiyle yarı fiyata satılır.</p>
            <button class="btn primary" data-act="confirm-close">Kapat</button>
            <button class="btn ghost" data-act="cancel">Vazgeç</button>
          </div>
          <div class="m-panel" data-panel="swap" hidden>
            <h3>Hangi balıkla takas?</h3>
            <div class="m-swatches" data-el="swatches"></div>
            <button class="btn ghost" data-act="cancel">Vazgeç</button>
          </div>
          <div class="m-panel" data-panel="summary" hidden>
            <h3>Pazar kapandı</h3>
            <p data-el="reason"></p>
            <dl class="m-ledger" data-el="ledger"></dl>
            <button class="btn primary" data-act="finish">Limana Dön</button>
          </div>
        </div>
      </div>`;
    this.canvas = root.querySelector('canvas')!;
    this.stage = this.el('stage');
  }

  private el(name: string): HTMLElement {
    return this.root.querySelector(`[data-el="${name}"]`) as HTMLElement;
  }

  get overlayOpen(): boolean {
    return !this.el('overlay').hidden;
  }

  setEarnings(n: number): void {
    this.el('earn').textContent = money(n);
  }

  setLeft(n: number): void {
    this.el('left').textContent = n > 0 ? `Bantta ${n} balık` : 'Bant bitti';
  }

  setCombo(combo: number): void {
    const box = this.el('combo');
    box.hidden = combo < 2;
    if (combo >= 2) box.textContent = `KOMBO x${combo}`;
  }

  setEnergy(energy: number): void {
    this.el('energy')
      .querySelectorAll<HTMLElement>('i')
      .forEach((bar, i) => {
        const fill = Math.max(0, Math.min(1, (energy - i * ENERGY_PER_CHARGE) / ENERGY_PER_CHARGE));
        bar.style.setProperty('--fill', `${fill * 100}%`);
        bar.classList.toggle('full', fill >= 1);
      });
  }

  setPowers(energy: number, mode: Mode, urgent: boolean): void {
    this.root.querySelectorAll<HTMLButtonElement>('.m-power').forEach((b) => {
      const id = b.dataset.arg as PowerId;
      const ok = charges(energy) >= POWER_COST[id];
      b.disabled = !ok;
      b.classList.toggle('ready', ok);
      b.classList.toggle('active', mode === id);
      b.classList.toggle('urgent', ok && urgent);
    });
  }

  show(panel: Panel): void {
    this.root.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => {
      p.hidden = p.dataset.panel !== panel;
    });
    this.el('overlay').hidden = false;
  }

  hide(): void {
    this.el('overlay').hidden = true;
  }

  showSwap(species: SpeciesId[], current: SpeciesId): void {
    this.el('swatches').innerHTML = species
      .filter((sp) => sp !== current)
      .map((sp) => `<button data-act="swap-to" data-arg="${sp}" style="--c:${SPECIES[sp].color}"><i></i>${SPECIES[sp].name}</button>`)
      .join('');
    this.show('swap');
  }

  showSummary(out: MarketOut, reason: CloseReason): void {
    this.el('reason').textContent = REASON[reason];
    const row = (label: string, value: number, cls = ''): string =>
      value !== 0 ? `<dt>${label}</dt><dd class="${cls}">${cls === 'neg' ? '−' : ''}${money(value)}</dd>` : '';
    this.el('ledger').innerHTML = [
      row('Perakende', out.retail),
      row('Toptan satış', out.wholesale),
      row('İhracat', out.export),
      row('Akşam indirimi', out.clearance),
      row('Çöp cezası', out.penalty, 'neg'),
      `<dt class="total">Kazanç</dt><dd class="total">${money(out.earned)}</dd>`,
    ].join('');
    this.show('summary');
  }

  toast(text: string, ms = 3500): void {
    const t = this.el('toast');
    window.clearTimeout(this.toastTimer);
    if (!text) {
      t.hidden = true;
      return;
    }
    t.textContent = text;
    t.hidden = false;
    this.toastTimer = window.setTimeout(() => {
      t.hidden = true;
    }, ms);
  }

  dispose(): void {
    window.clearTimeout(this.toastTimer);
  }
}
