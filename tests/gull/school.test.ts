import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/app/rng';
import { SPECIES } from '../../src/app/species';
import { FISH_SCALE, School, type WaterEnv } from '../../src/scenes/gull/school';
import { CHARACTERS } from '../../src/scenes/gull/bogaz/config.js';
import { Player } from '../../src/scenes/gull/bogaz/player.js';

const env: WaterEnv & { t: number; windForce(): number } = {
  level: 350,
  t: 0,
  waterY: () => 350,
  windForce: () => 0,
};
const fx = { splash() {}, bubble() {}, dive() {} };

function school(dive: number, beak = 16, seed = 3): School {
  const rng = new Rng(seed);
  return new School({ dive, beak, random: () => rng.next() });
}

describe('martının balık sürüsü', () => {
  it('sadece martının tutabildiği türler doğar, kendi derinliklerinde', () => {
    const s = school(160);
    for (let i = 0; i < 500; i++) s.spawn();
    for (const f of s.fish) {
      const gd = SPECIES[f.sp].gullDepth;
      expect(gd).not.toBeNull();
      expect(f.depth).toBeGreaterThanOrEqual(Math.max(8, gd! - 6));
      expect(f.depth).toBeLessThanOrEqual(gd! + 10);
    }
    const kinds = new Set(s.fish.map((f) => f.sp));
    expect(kinds.has('kalkan')).toBe(false);
    expect(kinds.has('palamut')).toBe(true);
  });

  it('gaga menzilindeki balığı kapar, uzaktakini kapamaz', () => {
    const s = school(160, 16);
    const f = s.spawn(100);
    f.depth = 20;
    const y = s.y(f, env);
    const reach = 16 + (f.t.len * FISH_SCALE) / 2;
    expect(s.tryCatch(100 + reach + 2, y, env)).toBeNull();
    expect(s.tryCatch(100 + reach - 2, y, env)).toBe(f);
    expect(s.catch[f.sp]).toBe(1);
    expect(s.tryCatch(100, y, env)).toBeNull();
  });

  it('dalışın yetmediği derindeki balık görünür ama yakalanamaz', () => {
    const s = school(30);
    const deep = s.spawn(100);
    deep.depth = 130;
    expect(s.reachable(deep)).toBe(false);
    expect(s.tryCatch(100, s.y(deep, env), env)).toBeNull();
  });

  it('dünya kayınca balıklar sola gider, ekrandan çıkan ve yakalanan silinir', () => {
    const s = school(160);
    const f = s.spawn(0);
    f.swim = 0;
    s.update(0.5, 200, false);
    expect(s.fish).toHaveLength(0);
  });
});

describe('martı fiziği', () => {
  const cfg = (nefes: number) => ({ ...CHARACTERS.marti, outsideLimit: nefes });

  it('dalış sınırının altına inemez', () => {
    const p = new Player(cfg(99), 30);
    p.y = 360;
    p.inWater = true;
    p.pressDive();
    for (let i = 0; i < 360; i++) p.update(1 / 120, env, fx);
    expect(p.y - 350).toBeLessThanOrEqual(30.001);
    const deep = new Player(cfg(99), 160);
    deep.y = 360;
    deep.inWater = true;
    deep.pressDive();
    let maxDepth = 0;
    for (let i = 0; i < 360; i++) {
      deep.update(1 / 120, env, fx);
      maxDepth = Math.max(maxDepth, deep.y - 350);
    }
    expect(maxDepth).toBeGreaterThan(60);
  });

  it('nefes süresi dolunca boğulur; nefes yükseltmesi süreyi uzatır', () => {
    const drown = (nefes: number): number => {
      const p = new Player(cfg(nefes), 40);
      p.y = 380;
      p.pressDive();
      let t = 0;
      while (p.breath > 0 && t < 10) {
        p.update(1 / 120, env, fx);
        t += 1 / 120;
      }
      return t;
    };
    expect(drown(1.5)).toBeLessThan(1.8);
    expect(drown(3.7)).toBeGreaterThan(3.4);
  });
});
