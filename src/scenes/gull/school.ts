import type { Catch, SpeciesId } from '../../app/types';
import { SPECIES, speciesFor } from '../../app/species';
import { TYPES, type FishType } from '../fishing/data';

/** Martının Boğaz dünyası: sabit genişlik. */
const WORLD_W = 360;
/** Balık Avı'nın boyları 540'lık dünyaya göre; martı dünyasında küçültülür. */
export const FISH_SCALE = 0.55;

/** Su seviyesi ve dalga yüzeyi (Boğaz'ın Environment'ı bu arayüzü sağlar). */
export interface WaterEnv {
  level: number;
  waterY(x: number): number;
}

export interface SchoolFish {
  t: FishType;
  sp: SpeciesId;
  x: number;
  /** Su seviyesinin altındaki derinlik (px). */
  depth: number;
  dir: 1 | -1;
  swim: number;
  phase: number;
  caught: boolean;
}

export interface SchoolOptions {
  /** Martının inebildiği derinlik (px). Daha derindeki balıklar görünür ama yakalanamaz. */
  dive: number;
  /** Gaga menzili (px). */
  beak: number;
  random?: () => number;
}

const GULL_TYPES = new Map(
  speciesFor('marti').map((s) => [s.id, TYPES.find((t) => t.key === s.id)!] as const),
);

/**
 * Martının suda kovaladığı balıklar. Her tür kendi derinliğinde yüzer:
 * küçük balık yüzeye yakın, büyük balık derinde.
 */
export class School {
  fish: SchoolFish[] = [];
  readonly catch: Catch = {};
  private timer = 0.4;
  private readonly rnd: () => number;

  constructor(private readonly o: SchoolOptions) {
    this.rnd = o.random ?? Math.random;
  }

  private rand(a: number, b: number): number {
    return a + this.rnd() * (b - a);
  }

  /** Balığın ekrandaki y'si; gelgitle birlikte iner çıkar. */
  y(f: SchoolFish, env: WaterEnv): number {
    return env.level + f.depth + Math.sin(f.phase * 2.2) * 4;
  }

  reachable(f: SchoolFish): boolean {
    return f.depth <= this.o.dive + 8;
  }

  spawn(x = WORLD_W + 30): SchoolFish {
    const pool = [...GULL_TYPES.values()];
    const total = pool.reduce((sum, t) => sum + t.weight, 0);
    let r = this.rnd() * total;
    let t = pool[pool.length - 1];
    for (const cand of pool) {
      r -= cand.weight;
      if (r <= 0) {
        t = cand;
        break;
      }
    }
    const sp = t.species!;
    const f: SchoolFish = {
      t,
      sp,
      x,
      depth: Math.max(8, SPECIES[sp].gullDepth! + this.rand(-6, 10)),
      dir: this.rnd() < 0.5 ? 1 : -1,
      swim: this.rand(10, 45),
      phase: this.rand(0, 10),
      caught: false,
    };
    this.fish.push(f);
    return f;
  }

  /** Dünya `speed` ile sola kayar; balıklar kendi yönlerinde de yüzer. */
  update(dt: number, speed: number, playing: boolean): void {
    for (const f of this.fish) {
      f.phase += dt;
      f.x -= (speed - f.dir * f.swim) * dt;
    }
    this.fish = this.fish.filter((f) => !f.caught && f.x > -50 && f.x < WORLD_W + 120);
    if (!playing) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.rand(0.55, 1.25);
      this.spawn();
      if (this.rnd() < 0.3) this.spawn(WORLD_W + 70);
    }
  }

  /** Gaga balığa yetişiyorsa yakalar; yakalanan türü döner. */
  tryCatch(bx: number, by: number, env: WaterEnv): SchoolFish | null {
    for (const f of this.fish) {
      if (f.caught || !this.reachable(f)) continue;
      const reach = this.o.beak + (f.t.len * FISH_SCALE) / 2;
      const dx = bx - f.x;
      const dy = by - this.y(f, env);
      if (dx * dx + dy * dy <= reach * reach) {
        f.caught = true;
        this.catch[f.sp] = (this.catch[f.sp] ?? 0) + 1;
        return f;
      }
    }
    return null;
  }
}
