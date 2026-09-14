import './gull.css';
import { deferred, onAction, type SceneFactory } from '../../app/scene';
import type { GullIn, GullOut } from '../../app/types';
import { upgradeValue } from '../../app/upgrades';
import { catchCount } from '../../app/catch';
import { catchListHtml } from '../../ui/catch-list';
import { Sound } from './bogaz/audio.js';
import { GullGame, H, STEP, W } from './game';
import { drawHud } from './hud';

const UP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
const DIVE_KEYS = ['ArrowDown', 'KeyS'];

/** Martı: Boğaz'da uç, pike yapıp suya dal, balığı gagala. Çarpınca uçuş biter. */
export const gullScene: SceneFactory<GullIn, GullOut> = (root, input, app) => {
  const { promise, resolve } = deferred<GullOut>();
  const settings = app.profile.settings;
  const u = input.upgrades;
  root.classList.add('fixed', 'bleed');
  root.innerHTML = `
    <div class="gull" data-el="stage">
      <canvas></canvas>
      <div class="g-overlay" data-el="overlay" hidden>
        <div class="g-panel" data-panel="pause" hidden>
          <h3>Duraklatıldı</h3>
          <button class="btn primary" data-act="resume">Devam</button>
        </div>
        <div class="g-panel" data-panel="summary" hidden>
          <h3 data-el="reason"></h3>
          <p data-el="sumHead"></p>
          <div data-el="sumList"></div>
          <button class="btn primary" data-act="finish">Kovayı Pazara Götür</button>
        </div>
      </div>
    </div>`;

  const el = (name: string): HTMLElement => root.querySelector(`[data-el="${name}"]`) as HTMLElement;
  const stage = el('stage');
  const canvas = root.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;

  const game = new GullGame({
    nefes: upgradeValue('nefes', u.nefes),
    dalis: upgradeValue('dalis', u.dalis),
    gaga: upgradeValue('gaga', u.gaga),
    simit: upgradeValue('simit', u.simit),
  });
  const sound = new Sound(settings.sound);

  let k = 1;
  let alive = true;
  let paused = false;
  let summaryShown = false;
  let finished = false;
  let raf = 0;
  const timers: number[] = [];

  const haptic = (ms: number): void => {
    if (settings.haptics && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  };

  // Tuval 360×640 oranını korur; kalan boşluk o anki gökyüzü ve kum rengine boyanır (Boğaz'daki gibi).
  const resize = (): void => {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const scale = Math.min(rect.width / W, rect.height / H);
    canvas.style.width = `${Math.floor(W * scale)}px`;
    canvas.style.height = `${Math.floor(H * scale)}px`;
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
    k = canvas.width / W;
    game.world.resize(k);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  let letterboxT = 0;
  const paintLetterbox = (): void => {
    const p = game.env.pal as { skyTop: number[]; sand: number[]; dark: number };
    const night = [3, 6, 18];
    const shade = (c: number[]): string => `rgb(${c.map((v, i) => Math.round(v * (1 - p.dark) + night[i] * p.dark)).join(',')})`;
    stage.style.background = `linear-gradient(${shade(p.skyTop)} 50%, ${shade(p.sand)} 50%)`;
  };

  const showPanel = (name: 'pause' | 'summary' | null): void => {
    el('overlay').hidden = name === null;
    root.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => {
      p.hidden = p.dataset.panel !== name;
    });
  };

  const showSummary = (): void => {
    const c = game.school.catch;
    const fish = catchCount(c);
    const junk = catchCount(c, true) - fish;
    el('reason').textContent = game.deathReason;
    el('sumHead').textContent = `${game.score} engel geçtin · ${fish} balık${junk ? ` · ${junk} çöp` : ''}`;
    el('sumList').innerHTML = catchListHtml(c);
    showPanel('summary');
  };

  // ---------- Girdi ----------
  const onDown = (e: PointerEvent): void => {
    if ((e.target as HTMLElement).closest('.g-overlay')) return;
    e.preventDefault();
    sound.unlock();
    if (!paused && !summaryShown) game.press();
  };
  const onUp = (): void => game.release();
  const onKeyDown = (e: KeyboardEvent): void => {
    if (UP_KEYS.includes(e.code) || DIVE_KEYS.includes(e.code)) e.preventDefault();
    if (e.repeat || paused || summaryShown) return;
    sound.unlock();
    if (UP_KEYS.includes(e.code)) game.press();
    else if (DIVE_KEYS.includes(e.code)) game.press(true);
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    if (UP_KEYS.includes(e.code) || DIVE_KEYS.includes(e.code)) game.release();
  };
  const onVisibility = (): void => {
    if (document.hidden && game.state === 'play' && !paused) {
      paused = true;
      game.release();
      showPanel('pause');
    }
  };
  const onMenu = (e: Event): void => e.preventDefault();

  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('contextmenu', onMenu);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('blur', onUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  document.addEventListener('visibilitychange', onVisibility);

  const offAction = onAction(root, (act) => {
    if (act === 'resume') {
      paused = false;
      showPanel(null);
    } else if (act === 'finish' && !finished) {
      finished = true;
      resolve({ catch: { ...game.school.catch }, passed: game.score });
    }
  });

  // ---------- Döngü: sabit adımlı fizik, her karede çizim ----------
  let last = performance.now();
  let acc = 0;
  const frame = (now: number): void => {
    if (!alive) return;
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!paused) {
      while (acc >= STEP) {
        game.update(STEP);
        acc -= STEP;
      }
    } else {
      acc = 0;
    }
    for (const s of game.sounds) {
      if (s === 'catch') {
        sound.catchFish();
        haptic(15);
      } else if (s === 'junk') sound.junk();
      else if (s === 'hit') {
        sound.hit();
        haptic(60);
      } else (sound as unknown as Record<string, () => void>)[s]?.();
    }
    game.sounds.length = 0;

    game.render(ctx, k);
    drawHud(ctx, game);
    if ((letterboxT += 1) % 20 === 1) paintLetterbox();

    if (game.state === 'over' && !summaryShown) {
      summaryShown = true;
      timers.push(window.setTimeout(showSummary, 900));
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  if (import.meta.env.DEV) {
    (window as unknown as { __gull?: object }).__gull = { game };
  }

  return {
    done: promise,
    destroy: () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      offAction();
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('contextmenu', onMenu);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('visibilitychange', onVisibility);
      for (const t of timers) window.clearTimeout(t);
      sound.dispose();
      root.classList.remove('fixed', 'bleed');
    },
  };
};
