import './market.css';
import { deferred, onAction, type SceneFactory } from '../../app/scene';
import type { MarketIn, MarketOut, SpeciesId } from '../../app/types';
import { SPECIES, SPECIES_ORDER } from '../../app/species';
import { money } from '../../app/format';
import { dispatch, getPiece, liveEarnings, marketOut, newMarket, piecesLeft } from './core/market';
import { POWER_COST, WHOLESALE_MIN, charges } from './core/rules';
import type { Action, Coord, MarketEvent, PowerId, Source } from './core/types';
import { computeLayout, type Layout } from './render/layout';
import { Renderer } from './render/renderer';
import { Fx, centroidOf } from './render/fx';
import { shade } from './render/sprites';
import { attachPointer, type DragView, type Mode } from './input';
import { Hud } from './hud';
import { Sfx } from './sfx';

const GOLD = '#ffd23f';
const INK = '#eef4ff';

/** Karaköy Gece Pazarı: kovadaki balıklar kasa olarak tezgâha dizilir ve satılır. */
export const marketScene: SceneFactory<MarketIn, MarketOut> = (root, input, app) => {
  const { promise, resolve } = deferred<MarketOut>();
  const settings = app.profile.settings;
  root.classList.add('fixed', 'night');

  let state = newMarket(input);
  const hud = new Hud(root);
  const ctx = hud.canvas.getContext('2d')!;
  const fx = new Fx();
  const renderer = new Renderer();
  const sfx = new Sfx();
  fx.colorblind = settings.colorblind;
  renderer.colorblind = settings.colorblind;
  sfx.enabled = settings.sound;

  let layout: Layout = computeLayout(320, 480, 1, state.size, state.holds.length);
  let drag: DragView | null = null;
  let mode: Mode = 'play';
  let swapSrc: Source | null = null;
  let hover: { x: number; y: number } | null = null;
  let alive = true;
  let finished = false;
  let raf = 0;
  const timers: number[] = [];

  const haptic = (ms: number): void => {
    if (settings.haptics && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  };

  const refresh = (): void => {
    hud.setEarnings(liveEarnings(state));
    hud.setLeft(piecesLeft(state));
    hud.setCombo(state.combo);
    hud.setEnergy(state.energy);
    hud.setPowers(state.energy, mode, state.status === 'rescue');
  };

  const setMode = (next: Mode): void => {
    mode = next;
    hover = null;
    refresh();
  };

  const handle = (events: MarketEvent[]): void => {
    let from: Coord = { x: state.size / 2, y: state.size / 2 };
    for (const e of events) {
      switch (e.type) {
        case 'placed':
          from = centroidOf(e.cells);
          fx.popCells(e.cells);
          sfx.place();
          haptic(10);
          break;
        case 'rotated':
          renderer.noteRotate(e.uid);
          sfx.rotate();
          haptic(6);
          break;
        case 'lines':
          fx.lineClear(e.cells, from);
          sfx.lineClear(state.combo);
          haptic(18);
          break;
        case 'wholesale': {
          fx.burst(e.cells, e.export);
          sfx.wholesale(SPECIES_ORDER.indexOf(e.sp), e.export);
          const at = centroidOf(e.cells);
          const label = e.export ? 'İHRACAT KAMYONU!' : 'TOPTAN SATIŞ!';
          fx.text(label, { x: at.x, y: at.y - 0.6 }, shade(SPECIES[e.sp].color, 0.5), e.export ? 1.1 : 0.95);
          haptic(e.export ? 60 : 30);
          break;
        }
        case 'ring':
          fx.ring(e.cells);
          break;
        case 'sale':
          fx.text(`+${money(e.amount)}`, { x: e.at.x, y: e.at.y + 0.7 }, GOLD, 0.85);
          sfx.coin();
          break;
        case 'boardClear':
          fx.text('TEZGÂH BOŞALDI!', { x: state.size / 2, y: state.size / 2 }, INK, 1.05);
          haptic(50);
          break;
        case 'energy':
          if (e.chargedUp) sfx.charge();
          break;
        case 'cat':
          fx.single(e.cell);
          sfx.power();
          haptic(20);
          break;
        case 'swap':
        case 'shuffle':
        case 'held':
          sfx.power();
          break;
        case 'rescue':
          mode = 'play';
          hud.show('rescue');
          break;
        case 'closed': {
          mode = 'play';
          drag = null;
          sfx.close();
          const out = marketOut(state);
          const reason = e.reason;
          timers.push(window.setTimeout(() => hud.showSummary(out, reason), 650));
          break;
        }
        default:
          break;
      }
    }
  };

  const act = (a: Action): boolean => {
    const r = dispatch(state, a);
    if (!r.ok) {
      sfx.invalid();
      return false;
    }
    state = r.state;
    handle(r.events);
    refresh();
    return true;
  };

  const usePower = (p: PowerId): void => {
    if (state.status === 'closed') return;
    if (charges(state.energy) < POWER_COST[p]) {
      sfx.invalid();
      return;
    }
    if (p === 'shuffle') {
      act({ type: 'shuffle' });
      return;
    }
    if (p === 'cat') {
      const on = mode !== 'cat';
      setMode(on ? 'cat' : 'play');
      hud.toast(on ? 'Kedinin kapacağı kasaya dokun' : '');
      return;
    }
    const on = mode !== 'swap';
    swapSrc = null;
    setMode(on ? 'swap' : 'play');
    hud.toast(on ? 'Takas edeceğin balığa dokun' : '');
  };

  const offAction = onAction(root, (a, arg) => {
    switch (a) {
      case 'power':
        usePower(arg as PowerId);
        break;
      case 'ask-close':
        if (state.status !== 'closed') hud.show('confirm');
        break;
      case 'confirm-close':
        hud.hide();
        act({ type: 'close' });
        break;
      case 'cancel':
        hud.hide();
        swapSrc = null;
        setMode('play');
        break;
      case 'use-power':
        hud.hide();
        hud.toast('Kedi bir kasayı kapsın ya da bandı karıştır', 4000);
        break;
      case 'swap-to': {
        const src = swapSrc;
        swapSrc = null;
        hud.hide();
        setMode('play');
        if (src) act({ type: 'swap', src, sp: arg as SpeciesId });
        break;
      }
      case 'finish':
        if (!finished) {
          finished = true;
          resolve(marketOut(state));
        }
        break;
      default:
        break;
    }
  });

  const detachPointer = attachPointer(hud.canvas, {
    state: () => state,
    layout: () => layout,
    mode: () => mode,
    enabled: () => state.status !== 'closed' && !hud.overlayOpen,
    onRotate: (src) => act({ type: 'rotate', src }),
    onPlace: (src, x, y) => act({ type: 'place', src, x, y }),
    onHold: (slot, hold) => act({ type: 'hold', slot, hold }),
    onBoardTap: (x, y) => {
      if (mode !== 'cat') return;
      if (!state.board[y * state.size + x]) {
        sfx.invalid();
        return;
      }
      act({ type: 'cat', x, y });
      setMode('play');
      hud.toast('');
    },
    onPickPiece: (src) => {
      const p = getPiece(state, src);
      if (!p) return;
      if (!state.species.some((sp) => sp !== p.sp)) {
        hud.toast('Takas için pazarda başka tür yok');
        return;
      }
      swapSrc = src;
      hud.showSwap(state.species, p.sp);
    },
    onDrag: (d) => {
      drag = d;
    },
    onHover: (cell) => {
      hover = cell;
    },
  });

  const resize = (): void => {
    const rect = hud.stage.getBoundingClientRect();
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    hud.canvas.width = Math.max(2, Math.round(rect.width * dpr));
    hud.canvas.height = Math.max(2, Math.round(rect.height * dpr));
    layout = computeLayout(hud.canvas.width, hud.canvas.height, dpr, state.size, state.holds.length);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(hud.stage);
  resize();

  let last = performance.now();
  const frame = (now: number): void => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    fx.update(dt);
    renderer.draw(ctx, layout, { state, drag, mode, hover }, fx, dt, now / 1000);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  // Geliştirme sırasında tarayıcı konsolundan durum okumak ve test etmek için.
  if (import.meta.env.DEV) {
    (window as unknown as { __market?: object }).__market = { state: () => state, layout: () => layout, act };
  }

  refresh();
  hud.toast(`Aynı türden ${WHOLESALE_MIN} kasa (en az 2 balık) yan yana gelince toptan satılır`, 4500);

  return {
    done: promise,
    destroy: () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      detachPointer();
      offAction();
      hud.dispose();
      for (const t of timers) window.clearTimeout(t);
      sfx.dispose();
      root.classList.remove('fixed', 'night');
    },
  };
};
