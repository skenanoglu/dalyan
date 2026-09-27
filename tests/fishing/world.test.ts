import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/app/rng';
import { FishingWorld, HOOK_TOP, SURFACE, type Input, type WorldOptions } from '../../src/scenes/fishing/world';
import { TYPES } from '../../src/scenes/fishing/data';

const idle: Input = { left: false, right: false, up: false, down: false };
const down: Input = { ...idle, down: true };
const STEP = 1 / 60;

function make(extra: Partial<WorldOptions> = {}): FishingWorld {
  const rng = new Rng(7);
  return new FishingWorld({
    zone: 'kiyi',
    viewHeight: 900,
    misinaM: 12,
    inisHizi: 190,
    makara: 1,
    duration: 90,
    baitLikes: [],
    hookMaxPrice: Infinity,
    lineDurability: 0,
    sharkReady: false,
    bucketCap: Infinity,
    random: () => rng.next(),
    ...extra,
  });
}

function run(w: FishingWorld, seconds: number, input: Input = idle): void {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) w.update(STEP, input);
}

/** Balıksız, yeni balık doğmayan dünya. */
function empty(extra: Partial<WorldOptions> = {}): FishingWorld {
  const w = make(extra);
  w.fishes = [];
  w.spawnTimer = 1e9;
  return w;
}

function putAtHook(w: FishingWorld, key: string): void {
  const t = TYPES.find((x) => x.key === key)!;
  w.fishes.push({ t, x: w.hook.x, y: w.hook.y, baseY: w.hook.y, dir: 1, speed: 0, phase: 0, caught: false, cool: 0 });
}

describe('av dünyası', () => {
  it('dikey ekranda kıyı en az ekranı doldurur; derin bölge kendi derinliğini korur', () => {
    expect(make({ viewHeight: 900 }).tabanY).toBe(SURFACE + 650);
    expect(make({ viewHeight: 500 }).tabanY).toBe(SURFACE + 380);
    expect(make({ zone: 'marmara', viewHeight: 900 }).tabanY).toBe(SURFACE + 2100);
  });

  it('süre kullanıcının seçtiği kadardır; bitince av kapanır', () => {
    const w = make({ duration: 15 });
    w.start();
    expect(w.timeLeft).toBe(15);
    run(w, 16);
    expect(w.over).toBe(true);
    expect(w.events).toContain('end');
  });

  it('olta kurşun hızıyla iner ve misina sınırında durur', () => {
    const w = empty({ misinaM: 12 });
    run(w, 0.5, down);
    expect(w.hook.y).toBeCloseTo(HOOK_TOP + 95, 3);
    run(w, 10, down);
    expect(w.hook.y).toBeCloseTo(SURFACE + 12 * w.pxMetre, 3);
    expect(w.hookHasEntered).toBe(true);
  });

  it('takılan balık çekilince para değil kovaya girer', () => {
    const w = empty();
    run(w, 0.6, down);
    putAtHook(w, 'lufer');
    w.update(STEP, idle);
    expect(w.hook.fish?.t.key).toBe('lufer');
    run(w, 5);
    expect(w.catch).toEqual({ lufer: 1 });
    expect(w.events).toEqual(expect.arrayContaining(['catch', 'score']));
  });

  it('çöp de kovaya girer (pazarda ceza olur)', () => {
    const w = empty();
    run(w, 0.6, down);
    putAtHook(w, 'cizme');
    run(w, 5);
    expect(w.catch).toEqual({ cizme: 1 });
    expect(w.events).toContain('bad');
  });

  it('boş oltaya köpekbalığı çarparsa misina kopar: dayanıklılık cezayı azaltır', () => {
    const w = empty();
    run(w, 0.6, down);
    const before = w.timeLeft;
    putAtHook(w, 'kopekbaligi');
    w.update(STEP, idle);
    expect(before - w.timeLeft).toBeCloseTo(5 + STEP, 3);
    expect(w.hook.y).toBe(HOOK_TOP);

    const strong = empty({ lineDurability: 3 });
    run(strong, 0.6, down);
    const beforeStrong = strong.timeLeft;
    putAtHook(strong, 'kopekbaligi');
    strong.update(STEP, idle);
    expect(beforeStrong - strong.timeLeft).toBeCloseTo(2 + STEP, 3);
  });

  it('en güçlü olta ve misinayla köpekbalığı kaçırılmaz, kovaya girer', () => {
    const w = empty({ sharkReady: true });
    run(w, 0.6, down);
    putAtHook(w, 'kopekbaligi');
    w.update(STEP, idle);
    expect(w.hook.fish?.t.key).toBe('kopekbaligi');
    run(w, 5);
    expect(w.catch).toEqual({ kopekbaligi: 1 });
  });

  it('iğne yeterince güçlü değilse pahalı türler doğmaz', () => {
    const w = make({ zone: 'marmara', viewHeight: 5000, hookMaxPrice: 25 });
    for (let i = 0; i < 2000; i++) w.spawnFish(true);
    const keys = new Set(w.fishes.map((f) => f.t.key));
    expect(keys.has('hamsi')).toBe(true);
    expect(keys.has('fener')).toBe(false);
    expect(keys.has('kopekbaligi')).toBe(true); // tehlike her zaman görünür
  });

  it('kova doluyken yeni balık takılmaz', () => {
    const w = empty({ bucketCap: 1 });
    run(w, 0.6, down);
    putAtHook(w, 'lufer');
    run(w, 5);
    expect(w.catch).toEqual({ lufer: 1 });
    run(w, 0.6, down);
    putAtHook(w, 'hamsi');
    w.update(STEP, idle);
    expect(w.hook.fish).toBeNull();
  });

  it('balık takılıyken ↓ ile balık aşağı gönderilir', () => {
    const w = empty();
    run(w, 0.6, down);
    putAtHook(w, 'lufer');
    w.update(STEP, idle);
    const y0 = w.hook.y;
    w.update(STEP, down);
    expect(w.hook.y).toBeGreaterThan(y0);
  });

  it('süre biterken oltadaki balık kaçar', () => {
    const w = empty();
    run(w, 0.6, down);
    putAtHook(w, 'kalkan');
    w.update(STEP, idle);
    expect(w.hook.fish).not.toBeNull();
    w.timeLeft = 0.001;
    w.update(STEP, idle);
    expect(w.over).toBe(true);
    expect(w.hook.fish).toBeNull();
    expect(w.catch).toEqual({});
  });

  it('yem sevdiği türleri daha sık getirir', () => {
    const share = (baitLikes: WorldOptions['baitLikes']): number => {
      const w = make({ zone: 'bogaz', misinaM: 40, baitLikes });
      for (let i = 0; i < 3000; i++) w.spawnFish(true);
      const fish = w.fishes.filter((f) => f.t.species && !f.t.junk);
      return fish.filter((f) => f.t.key === 'lufer' || f.t.key === 'palamut').length / fish.length;
    };
    expect(share(['lufer', 'palamut'])).toBeGreaterThan(share([]) + 0.1);
  });

  it('yalnızca bölgenin derinliğindeki türler doğar', () => {
    const w = make({ zone: 'kiyi', viewHeight: 5000 });
    for (let i = 0; i < 2000; i++) w.spawnFish(true);
    const keys = new Set(w.fishes.map((f) => f.t.key));
    expect(keys.has('hamsi')).toBe(true);
    expect(keys.has('kalkan')).toBe(false);
    expect(keys.has('fener')).toBe(false);
  });
});

describe('hava ve gece', () => {
  it('fırtınada rüzgâr tekneyi sürükler; güneşte tekne yerinde durur', () => {
    const calm = empty();
    const storm = empty({ weather: 'firtina' });
    storm.windDir = 1;
    storm.windTimer = 99;
    const x0 = calm.boat.x;
    run(calm, 2);
    run(storm, 2);
    expect(Math.abs(calm.boat.x - x0)).toBeLessThan(1);
    expect(storm.boat.x - x0).toBeGreaterThan(60);
  });

  it('fırtınada dalga derindeki oltayı savurur', () => {
    const sway = (weather: WorldOptions['weather']): number => {
      const w = empty({ weather, misinaM: 12 });
      w.windTimer = 99;
      run(w, 3, down);
      let max = 0;
      for (let i = 0; i < 240; i++) {
        w.update(STEP, idle);
        max = Math.max(max, Math.abs(w.hook.x - w.rodTip().x));
      }
      return max;
    };
    expect(sway('firtina')).toBeGreaterThan(sway('gunes') + 5);
  });

  it('yağmur ve fırtınada gökten damla düşer; güneşte düşmez', () => {
    const rain = empty({ weather: 'yagmur' });
    const sun = empty();
    run(rain, 0.5);
    run(sun, 0.5);
    expect(rain.drops.length).toBeGreaterThan(10);
    expect(sun.drops).toHaveLength(0);
  });

  it('gece fener balığı sığa çıkar, lüfer daha sık görünür', () => {
    const count = (night: boolean) => {
      const w = make({ zone: 'marmara', viewHeight: 6000, night });
      for (let i = 0; i < 4000; i++) w.spawnFish(true);
      const shallowFener = w.fishes.filter((f) => f.t.key === 'fener' && w.depthMetre(f.baseY) < 69).length;
      const fish = w.fishes.filter((f) => f.t.species && !f.t.junk);
      return { shallowFener, lufer: fish.filter((f) => f.t.key === 'lufer').length / fish.length };
    };
    const day = count(false);
    const night = count(true);
    expect(day.shallowFener).toBe(0);
    expect(night.shallowFener).toBeGreaterThan(0);
    expect(night.lufer).toBeGreaterThan(day.lufer * 1.3);
  });

  it('fırtınada şimşek çakar', () => {
    const w = empty({ weather: 'firtina' });
    run(w, 60);
    expect(w.events).toContain('thunder');
  });
});
