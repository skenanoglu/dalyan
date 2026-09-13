/** mulberry32 adımı: [0,1) aralığında sayı ve yeni durum döner. */
export function nextRandom(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** Durumu tek bir sayı olan, JSON ile kaydedilebilen seed'li RNG. */
export class Rng {
  constructor(public state: number) {}

  next(): number {
    const [value, state] = nextRandom(this.state);
    this.state = state;
    return value;
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  range(a: number, b: number): number {
    return a + this.next() * (b - a);
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }

  /** Ağırlıklı seçim. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    const total = items.reduce((sum, it) => sum + weight(it), 0);
    let r = this.next() * total;
    for (const it of items) {
      r -= weight(it);
      if (r < 0) return it;
    }
    return items[items.length - 1];
  }
}

export function randomSeed(): number {
  return (Math.random() * 0x100000000) >>> 0;
}
