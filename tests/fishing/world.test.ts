import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/app/rng';
import { FishingWorld, HOOK_GAP, HOOK_TOP, SURFACE, type Input, type WorldOptions } from '../../src/scenes/fishing/world';
import { TYPES } from '../../src/scenes/fishing/data';

const idle: Input = { left: false, right: false, up: false, down: false };
const down: Input = { ...idle, down: true };
const up: Input = { ...idle, up: true };
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

function putAt(w: FishingWorld, key: string, x: number, y: number): void {
  const t = TYPES.find((k) => k.key === key)!;
  w.fishes.push({ t, x, y, baseY: y, dir: 1, speed: 0, phase: 0, caught: false, cool: 0 });
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
    expect(w.events).toEqual(expect.arrayContaining(['catch', 'rare']));
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

  it('tutulan kalamar bazen mürekkep püskürtür; mürekkep zamanla söner', () => {
    const inky = empty({ random: () => 0.1 });
    run(inky, 0.6, down);
    putAtHook(inky, 'kalamar');
    inky.update(STEP, idle);
    expect(inky.hook.fish?.t.key).toBe('kalamar');
    expect(inky.inks.length).toBeGreaterThan(0);
    expect(inky.events).toContain('ink');
    run(inky, 3);
    expect(inky.inks).toHaveLength(0);

    const calm = empty({ random: () => 0.9 });
    run(calm, 0.6, down);
    putAtHook(calm, 'kalamar');
    calm.update(STEP, idle);
    expect(calm.hook.fish?.t.key).toBe('kalamar');
    expect(calm.inks).toHaveLength(0);

    // diğer türler mürekkep çıkarmaz
    const fish = empty({ random: () => 0.1 });
    run(fish, 0.6, down);
    putAtHook(fish, 'hamsi');
    fish.update(STEP, idle);
    expect(fish.inks).toHaveLength(0);
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

  it('birden çok iğne kısa aralıkla ana iğneyi izler', () => {
    const w = empty({ hookCount: 3 });
    run(w, 0.6, down);
    expect(w.hooks).toHaveLength(3);
    expect(w.hooks[1].y - w.hooks[0].y).toBeCloseTo(HOOK_GAP, 0);
    expect(w.hooks[2].y - w.hooks[0].y).toBeCloseTo(HOOK_GAP * 2, 0);
  });

  it('her iğne kendi takılı yemini taşır; verilmezse ekmek varsayılır', () => {
    const w = make({ hookCount: 3, baitSlots: ['solucan', 'kalamar'] });
    expect(w.hooks.map((h) => h.baitId)).toEqual(['solucan', 'kalamar', 'ekmek']);
  });

  it('iki iğneli oltada iki balık aynı anda takılıp kovaya girer', () => {
    const w = empty({ hookCount: 2 });
    run(w, 0.6, down);
    putAt(w, 'lufer', w.hooks[0].x, w.hooks[0].y);
    putAt(w, 'hamsi', w.hooks[1].x, w.hooks[1].y);
    w.update(STEP, idle);
    expect(w.hooks[0].fish?.t.key).toBe('lufer');
    expect(w.hooks[1].fish?.t.key).toBe('hamsi');
    run(w, 5);
    expect(w.catch).toEqual({ lufer: 1, hamsi: 1 });
  });

  it('nadir balığı sürekli ↑ ile zorlamak gerginliği doldurur; tavana varınca balık kurtulur', () => {
    const w = empty();
    run(w, 3, down); // misina sınırına kadar indir: yüzeye çıkış, gerginlik dolmasından uzun sürsün
    putAtHook(w, 'lufer');
    w.update(STEP, idle);
    expect(w.hook.fish?.t.key).toBe('lufer');
    run(w, 3, up);
    expect(w.events).toContain('escape');
    expect(w.hook.fish).toBeNull();
    expect(w.catch).toEqual({});
  });

  it('fırtınada nadir türler daha sık doğar', () => {
    const share = (weather: WorldOptions['weather']): number => {
      const w = make({ zone: 'bogaz', viewHeight: 5000, weather });
      for (let i = 0; i < 3000; i++) w.spawnFish(true);
      const fish = w.fishes.filter((f) => f.t.species && !f.t.junk);
      return fish.filter((f) => f.t.rare).length / fish.length;
    };
    expect(share('firtina')).toBeGreaterThan(share('gunes') + 0.05);
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

/** Zıpkınla dalış: dalgıç suya iner, tekne onu izler. */
function dive(extra: Partial<WorldOptions> = {}): FishingWorld {
  return empty({ diver: { depthM: 12, speed: 150, durability: 0, ammo: 30 }, ...extra });
}
const fire: Input = { ...idle, fire: true };
const swimDown: Input = { ...idle, down: true };

describe('zıpkınla dalış', () => {
  it('dalgıç tüpün derinliğinde durur ve olta çalışmaz', () => {
    const w = dive();
    expect(w.diving).toBe(true);
    run(w, 8, swimDown);
    expect(w.diver.y).toBeCloseTo(SURFACE + 12 * w.pxMetre, 0);
    expect(w.hooks[0].y).toBe(HOOK_TOP);
    expect(w.hookHasEntered).toBe(true);
  });

  it('dalgıç yön tuşlarıyla yüzer ve tekne onu izler', () => {
    const w = dive();
    const x0 = w.diver.x;
    run(w, 1.5, { ...idle, right: true });
    expect(w.diver.x).toBeGreaterThan(x0 + 80);
    expect(w.diver.dir).toBe(1);
    run(w, 3, { ...idle, left: true });
    expect(w.diver.dir).toBe(-1);
    expect(Math.abs(w.boat.x - w.diver.x)).toBeLessThan(200);
  });

  it('zıpkın bakılan yöndeki balığı vurur ve kovaya girer', () => {
    const w = dive();
    run(w, 1, swimDown);
    putAt(w, 'levrek', w.diver.x + 90, w.diver.y);
    w.update(STEP, fire);
    expect(w.spears).toHaveLength(1);
    run(w, 0.5);
    expect(w.catch).toEqual({ levrek: 1 });
    expect(w.events).toContain('spear');
  });

  it('zıpkının bekleme süresi var; sürekli basmak her karede atmaz', () => {
    const w = dive();
    run(w, 1, swimDown);
    run(w, 0.3, fire);
    expect(w.spears.length + w.fishes.length).toBeLessThanOrEqual(1);
  });

  it('her atış bir zıpkın harcar; zıpkın bitince atış yapılamaz', () => {
    const w = dive({ diver: { depthM: 12, speed: 150, durability: 0, ammo: 2 } });
    expect(w.ammo).toBe(2);
    run(w, 1, swimDown);
    w.update(STEP, fire);
    expect(w.ammo).toBe(1);
    w.diver.cool = 0;
    w.update(STEP, fire);
    expect(w.ammo).toBe(0);
    w.diver.cool = 0;
    w.spears = [];
    w.update(STEP, fire);
    expect(w.ammo).toBe(0);
    expect(w.spears).toHaveLength(0);
  });

  it('zıpkın çöpe takılmaz; kova doluysa balık vurulmaz', () => {
    const w = dive({ bucketCap: 1 });
    run(w, 1, swimDown);
    putAt(w, 'cizme', w.diver.x + 60, w.diver.y);
    w.update(STEP, fire);
    run(w, 0.5);
    expect(w.catch).toEqual({});
    w.diver.cool = 0;
    putAt(w, 'hamsi', w.diver.x + 60, w.diver.y);
    w.update(STEP, fire);
    run(w, 0.5);
    expect(w.catch).toEqual({ hamsi: 1 });
    w.diver.cool = 0;
    putAt(w, 'hamsi', w.diver.x + 60, w.diver.y);
    w.update(STEP, fire);
    run(w, 0.5);
    expect(w.catch).toEqual({ hamsi: 1 });
  });

  it('köpekbalığı dalgıca çarparsa zaman ve sersemleme cezası; dayanıklı tüp cezayı azaltır', () => {
    const w = dive();
    run(w, 1, swimDown);
    const before = w.timeLeft;
    putAt(w, 'kopekbaligi', w.diver.x, w.diver.y);
    w.update(STEP, idle);
    expect(before - w.timeLeft).toBeCloseTo(5 + STEP, 3);
    expect(w.diver.stun).toBeGreaterThan(0);

    const strong = dive({ diver: { depthM: 12, speed: 150, durability: 3, ammo: 30 } });
    run(strong, 1, swimDown);
    const b2 = strong.timeLeft;
    putAt(strong, 'kopekbaligi', strong.diver.x, strong.diver.y);
    strong.update(STEP, idle);
    expect(b2 - strong.timeLeft).toBeCloseTo(2 + STEP, 3);
  });

  it('en iyi tüple köpekbalığı da zıpkınlanabilir', () => {
    const w = dive({ sharkReady: true });
    run(w, 1, swimDown);
    putAt(w, 'kopekbaligi', w.diver.x + 80, w.diver.y);
    w.update(STEP, fire);
    run(w, 0.5);
    expect(w.catch).toEqual({ kopekbaligi: 1 });
  });
});

describe('martı, atılım ve çöp', () => {
  it('avcı balıklar ara sıra hızlanır, diğerleri hızlanmaz', () => {
    const w = empty();
    putAt(w, 'palamut', 100, 400);
    putAt(w, 'hamsi', 100, 450);
    let dashed = false;
    for (let i = 0; i < 1200; i++) {
      w.update(STEP, idle);
      for (const f of w.fishes) if (f.t.key === 'hamsi') expect(f.dash ?? 0).toBe(0);
      if ((w.fishes.find((f) => f.t.key === 'palamut')?.dash ?? 0) > 0) dashed = true;
      for (const f of w.fishes) if (f.x > 400 || f.x < 20) f.x = 100;
    }
    expect(dashed).toBe(true);
  });

  it('martı gelir, yüzeye yakın balığı kapıp gider', () => {
    const w = empty({ random: () => 0.1 }); // sabit rastgelelik: dalış kararı kesin "evet"
    w.gullTimer = 0;
    w.update(STEP, idle);
    expect(w.gulls).toHaveLength(1);
    // yüzeyde bir balık hazır tut
    putAt(w, 'hamsi', w.boat.x, SURFACE + 30);
    const fish = w.fishes[w.fishes.length - 1];
    fish.speed = 0;
    let ate = false;
    for (let i = 0; i < 60 * 12 && !ate; i++) {
      w.update(STEP, idle);
      fish.x = w.boat.x;
      fish.baseY = SURFACE + 30;
      fish.y = SURFACE + 30;
      if (!w.fishes.includes(fish)) ate = true;
    }
    expect(ate).toBe(true);
    expect(w.events).toContain('gull');
  });

  it('martı kancadaki balığı kapmaz', () => {
    const w = empty();
    run(w, 0.6, down);
    putAtHook(w, 'hamsi');
    w.update(STEP, idle);
    const hooked = w.hook.fish!;
    w.gullTimer = 0;
    w.update(STEP, idle);
    for (let i = 0; i < 60 * 8; i++) w.update(STEP, idle);
    expect(w.catch.hamsi === 1 || w.fishes.includes(hooked)).toBe(true);
  });

  it('PET şişe sığda, nadir bir çöp olarak doğar', () => {
    const w = make({ zone: 'kiyi', viewHeight: 900 });
    let pets = 0;
    let junk = 0;
    for (let i = 0; i < 3000; i++) {
      w.fishes = [];
      w.spawnFish(true);
      const f = w.fishes[0];
      if (f?.t.junk) junk++;
      if (f?.t.key === 'pet') pets++;
    }
    expect(pets).toBeGreaterThan(0);
    expect(pets).toBeLessThan(junk / 2);
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
