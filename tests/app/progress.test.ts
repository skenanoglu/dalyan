import { describe, expect, it } from 'vitest';
import { applyTrip, buyZone, canBuyZone, fishValue, voyageBonus, voyageTarget } from '../../src/app/progress';
import { defaultProfile } from '../../src/app/save';
import { upgradeCost, upgradeValue } from '../../src/app/upgrades';
import type { MarketOut } from '../../src/app/types';

const market = (earned: number): MarketOut => ({ earned, retail: earned, wholesale: 0, export: 0, clearance: 0, penalty: 0 });

describe('yolculuk', () => {
  it('tam varış +15 sn, inciler yem olur', () => {
    expect(voyageBonus({ passed: 10, arrived: true, pearls: 3 }, 10)).toEqual({ bonusSeconds: 15, bait: 3 });
  });

  it('yarı yol orantılı bonus verir', () => {
    expect(voyageBonus({ passed: 5, arrived: false, pearls: 1 }, 10)).toEqual({ bonusSeconds: 8, bait: 1 });
  });

  it('hızlı git bonus vermez', () => {
    expect(voyageBonus(null, 10)).toEqual({ bonusSeconds: 0, bait: 0 });
  });

  it('dürbün bonusu artırır, hedefin ötesi sayılmaz', () => {
    expect(voyageBonus({ passed: 30, arrived: true, pearls: 0 }, 10, 1.5).bonusSeconds).toBe(23);
  });

  it('motor hedefi kısaltır', () => {
    expect(voyageTarget('marmara', 0)).toBe(40);
    expect(voyageTarget('marmara', 2)).toBe(28);
    expect(voyageTarget('kiyi', 2)).toBe(7);
  });
});

describe('bölge açma', () => {
  it('para yetmezse açılmaz, yeterse parası düşülüp açılır', () => {
    const p = defaultProfile();
    p.money = 599;
    expect(canBuyZone(p, 'bogaz')).toBe(false);
    expect(buyZone(p, 'bogaz')).toBeNull();
    p.money = 700;
    const next = buyZone(p, 'bogaz')!;
    expect(next.money).toBe(100);
    expect(next.zones.bogaz).toBe(true);
    expect(p.zones.bogaz).toBe(false);
  });

  it('bölgeler sırayla açılır; açık bölge tekrar alınmaz', () => {
    const p = defaultProfile();
    p.money = 100_000;
    expect(canBuyZone(p, 'cukur')).toBe(false);
    expect(canBuyZone(p, 'kiyi')).toBe(false);
  });
});

describe('kasa değeri ve yükseltmeler', () => {
  it('balık değeri: tür fiyatı × bölge × kova; çöp cezası çarpansız', () => {
    expect(fishValue('lufer', 'bogaz', 0)).toBe(68);
    expect(fishValue('lufer', 'bogaz', 5)).toBe(101);
    expect(fishValue('cizme', 'marmara', 5)).toBe(-5);
  });

  it('fiyat taban × 1.8^seviye; en üstte null', () => {
    expect(upgradeCost('misina', 0)).toBe(120);
    expect(upgradeCost('misina', 1)).toBe(216);
    expect(upgradeCost('misina', 6)).toBeNull();
    expect(upgradeValue('tezgah', 99)).toBe(9);
  });
});

describe('sefer uygulama', () => {
  it('para, istatistik, defter ve varış işlenir', () => {
    const p = defaultProfile();
    p.logbook.hamsi = { count: 2 };
    const { profile, summary } = applyTrip(p, {
      zone: 'kiyi',
      voyage: { passed: 10, arrived: true, pearls: 2 },
      fishing: { catch: { hamsi: 4, lufer: 1, cizme: 2 } },
      market: market(320),
    });
    expect(profile.money).toBe(320);
    expect(profile.stats).toEqual({ trips: 1, totalMoney: 320, totalFish: 5 });
    expect(profile.logbook).toEqual({ hamsi: { count: 6 }, lufer: { count: 1 } });
    expect(profile.visited.kiyi).toBe(true);
    expect(summary).toEqual({ zone: 'kiyi', earned: 320, fish: 5, newSpecies: ['lufer'], arrived: true });
    expect(p.money).toBe(0);
  });

  it('hızlı git varış sayılmaz; sefer para kaybettirmez', () => {
    const p = defaultProfile();
    p.money = 50;
    const { profile, summary } = applyTrip(p, {
      zone: 'kiyi',
      voyage: null,
      fishing: { catch: { naylon: 3 } },
      market: market(-24),
    });
    expect(profile.money).toBe(50);
    expect(profile.visited.kiyi).toBe(false);
    expect(summary.arrived).toBeNull();
    expect(summary.earned).toBe(0);
  });
});
