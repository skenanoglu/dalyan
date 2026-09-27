import './fishing.css';
import { deferred, onAction, type SceneFactory } from '../../app/scene';
import type { FishingIn, FishingOut } from '../../app/types';
import { BOATS, HOOKS, LINES, RODS, unionBaitLikes } from '../../app/gear';
import { NIGHT, WEATHER } from '../../app/weather';
import { catchCount } from '../../app/catch';
import { catchListHtml } from '../../ui/catch-list';
import { Controls } from './controls';
import { FishingRenderer } from './draw';
import { FishingSfx } from './sfx';
import { FishingWorld, SURFACE, W } from './world';

/** Seçilen bölgede olta: tutulanlar kovaya girer, süre bitince kova pazara gider. */
export const fishingScene: SceneFactory<FishingIn, FishingOut> = (root, input, app) => {
  const { promise, resolve } = deferred<FishingOut>();
  const settings = app.profile.settings;
  root.classList.add('fixed', 'bleed', 'sea');
  root.innerHTML = `
    <div class="fishing">
      <canvas></canvas>
      <header class="f-hud" data-el="hud">
        <div class="f-chip" data-el="timeChip"><b data-el="time"></b><small>SN</small></div>
        <div class="f-zone"><b data-el="zone"></b><em data-el="weather"></em><small data-el="depth"></small></div>
        <div class="f-chip" data-el="bucketChip"><b data-el="bucket">0</b><small>KOVA</small></div>
        <button class="f-btn-pause" data-act="pause" aria-label="Duraklat">⏸</button>
      </header>
      <p class="f-hint" data-el="hint">▼ ile oltayı indir</p>
      <p class="f-banner" data-el="banner" hidden></p>
      <div class="f-pad" data-el="pad">
        <div class="f-group">
          <button class="f-btn" data-key="left" aria-label="Sola">◀</button>
          <button class="f-btn" data-key="right" aria-label="Sağa">▶</button>
        </div>
        <div class="f-group">
          <button class="f-btn" data-key="down" aria-label="İndir">▼</button>
          <button class="f-btn" data-key="up" aria-label="Çek">▲</button>
        </div>
      </div>
      <div class="f-overlay" data-el="overlay" hidden>
        <div class="f-panel" data-panel="pause" hidden>
          <h3>Duraklatıldı</h3>
          <button class="btn primary" data-act="resume">Devam</button>
          <button class="btn" data-act="stop">İstediğim Zaman: Şimdi Bitir</button>
        </div>
        <div class="f-panel" data-panel="summary" hidden>
          <h3>Av bitti</h3>
          <p data-el="sumHead"></p>
          <div data-el="sumList"></div>
          <button class="btn primary" data-act="finish">Kovayı Pazara Götür</button>
        </div>
      </div>
    </div>`;

  const el = (name: string): HTMLElement => root.querySelector(`[data-el="${name}"]`) as HTMLElement;
  const canvas = root.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const hud = { time: el('time'), timeChip: el('timeChip'), bucket: el('bucket'), bucketChip: el('bucketChip'), depth: el('depth'), hint: el('hint') };
  el('zone').textContent = '';

  const sfx = new FishingSfx();
  sfx.enabled = settings.sound;
  const renderer = new FishingRenderer();

  let cssW = Math.max(1, canvas.clientWidth);
  let cssH = Math.max(1, canvas.clientHeight);
  const rod = RODS[input.rod];
  const line = LINES[input.line ?? 'ince'];
  const hook = HOOKS[input.hook ?? 'adi'];
  const boat = BOATS[input.boat ?? 'sandal'];
  const world = new FishingWorld({
    zone: input.zone,
    viewHeight: (cssH * W) / cssW,
    misinaM: line.depth,
    inisHizi: rod.drop,
    makara: rod.reel,
    hookCount: input.baitSlots.length,
    duration: input.duration ?? 90,
    baitLikes: unionBaitLikes(input.baitSlots),
    hookMaxPrice: hook.maxPrice,
    lineDurability: line.durability,
    sharkReady: Boolean(rod.sharkReady && line.sharkReady),
    bucketCap: boat.capacity,
    weather: input.weather,
    night: input.night,
  });
  el('zone').textContent = world.zoneName;
  const weather = WEATHER[input.weather];
  el('weather').textContent = `${weather.icon} ${weather.name}${input.night ? ` · ${NIGHT.icon} Gece` : ''}`;
  const bannerText = [
    input.weather === 'firtina' ? '⛈️ Fırtına! Tekne sürüklenir, olta savrulur.' : '',
    input.weather === 'yagmur' ? '🌧️ Yağmur: balıklar hareketli, su bulanık.' : '',
    input.night ? `${NIGHT.icon} Gece: fener sadece yakını aydınlatır.` : '',
  ].filter(Boolean);

  let scale = 1;
  let topInset = 0;
  let lowQuality = false;
  let paused = false;
  let alive = true;
  let summaryShown = false;
  let finished = false;
  let raf = 0;
  const timers: number[] = [];

  const haptic = (ms: number): void => {
    if (settings.haptics && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  };

  const controls = new Controls(el('pad'), () => sfx.resume());

  const resize = (): void => {
    cssW = Math.max(1, canvas.clientWidth);
    cssH = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, lowQuality ? 1 : 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    scale = canvas.width / W;
    world.setViewHeight((cssH * W) / cssW);
    topInset = (el('hud').getBoundingClientRect().height * W) / cssW;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const showPanel = (name: 'pause' | 'summary' | null): void => {
    el('overlay').hidden = name === null;
    root.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => {
      p.hidden = p.dataset.panel !== name;
    });
  };

  const showSummary = (): void => {
    const fish = catchCount(world.catch);
    const junk = catchCount(world.catch, true) - fish;
    el('sumHead').textContent =
      fish + junk === 0 ? 'Kova boş kaldı.' : `${fish} balık${junk > 0 ? ` · ${junk} çöp` : ''}`;
    el('sumList').innerHTML = catchListHtml(world.catch);
    showPanel('summary');
  };

  const onVisibility = (): void => {
    if (document.hidden && !world.over && !paused) {
      paused = true;
      controls.releaseAll();
      showPanel('pause');
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  const offAction = onAction(root, (act) => {
    if (act === 'resume') {
      paused = false;
      showPanel(null);
      sfx.resume();
    } else if (act === 'pause' && !paused && !world.over) {
      paused = true;
      controls.releaseAll();
      showPanel('pause');
    } else if (act === 'stop') {
      paused = false;
      showPanel(null);
      world.end();
    } else if (act === 'finish' && !finished) {
      finished = true;
      resolve({ catch: { ...world.catch } });
    }
  });

  const onFirstTouch = (): void => sfx.resume();
  root.addEventListener('pointerdown', onFirstTouch);

  let lastTime = -1;
  let lastBucket = -1;
  let lastDepth = '';
  const updateHud = (): void => {
    const t = Math.max(0, Math.ceil(world.timeLeft));
    if (t !== lastTime) {
      lastTime = t;
      hud.time.textContent = String(t);
      hud.timeChip.classList.toggle('low', t <= 10 && !world.over);
    }
    const bucket = catchCount(world.catch, true);
    if (bucket !== lastBucket) {
      lastBucket = bucket;
      hud.bucket.textContent = Number.isFinite(world.bucketCap) ? `${bucket}/${world.bucketCap}` : String(bucket);
      hud.bucketChip.classList.toggle('full', bucket >= world.bucketCap);
    }
    let depth = '';
    if (world.hook.y > SURFACE) {
      const m = Math.max(0, Math.round((world.hook.y - SURFACE) / world.pxMetre));
      depth = `${m} m${world.hook.y >= world.hookFloor() - 1 ? ' · misina bitti' : ''}`;
    }
    if (depth !== lastDepth) {
      lastDepth = depth;
      hud.depth.textContent = depth;
    }
    hud.hint.hidden = world.hookHasEntered || world.over;
  };

  // Akıcı değilse bir kez kaliteyi düşür (Balık Avı'ndaki kaliteOlc).
  let measureStart = 0;
  let measureFrames = 0;
  const measure = (now: number): void => {
    if (lowQuality || paused || world.over || document.hidden) {
      measureStart = 0;
      return;
    }
    if (!measureStart) {
      measureStart = now;
      measureFrames = 0;
      return;
    }
    measureFrames++;
    const elapsed = now - measureStart;
    if (elapsed < 2000) return;
    if ((measureFrames * 1000) / elapsed < 45) {
      lowQuality = true;
      resize();
    }
    measureStart = now;
    measureFrames = 0;
  };

  let last = performance.now();
  const frame = (now: number): void => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused) world.update(dt, controls.input);
    for (const e of world.events) {
      sfx.play(e);
      if (e === 'catch') haptic(15);
      else if (e === 'bad' || e === 'zap') haptic(40);
      else if (e === 'thunder') haptic(80);
    }
    world.events.length = 0;
    updateHud();
    renderer.draw(ctx, world, { scale, lowQuality, topInset });
    measure(now);
    if (world.over && !summaryShown) {
      summaryShown = true;
      controls.releaseAll();
      timers.push(window.setTimeout(showSummary, 1200));
    }
    raf = requestAnimationFrame(frame);
  };

  world.start();
  raf = requestAnimationFrame(frame);

  if (bannerText.length > 0) {
    const banner = el('banner');
    banner.innerHTML = bannerText.join('<br>');
    banner.hidden = false;
    timers.push(window.setTimeout(() => (banner.hidden = true), 3600));
  }

  if (import.meta.env.DEV) {
    (window as unknown as { __fishing?: object }).__fishing = { world, controls };
  }

  return {
    done: promise,
    destroy: () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      offAction();
      document.removeEventListener('visibilitychange', onVisibility);
      root.removeEventListener('pointerdown', onFirstTouch);
      for (const t of timers) window.clearTimeout(t);
      sfx.dispose();
      root.classList.remove('fixed', 'bleed', 'sea');
    },
  };
};
