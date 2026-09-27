import { describe, expect, it } from 'vitest';
import type { BaitId } from '../../src/app/types';
import {
  activeBaitSlots,
  applyTrip,
  buyBait,
  buyHookSlot,
  buyRod,
  buyZone,
  canBuyHookSlot,
  canBuyZone,
  nextHookSlotPrice,
  rodHookCapacity,
  sellCatch,
  setBaitSlot,
  unitPrice,
  varietyMultiplier,
} from '../../src/app/progress';
import { defaultProfile } from '../../src/app/save';
import { BAITS, LINES, LINE_ORDER, RODS } from '../../src/app/gear';
import { afterTheft, catTarget } from '../../src/scenes/market/scene';
import { Rng } from '../../src/app/rng';
import { rollWeather } from '../../src/app/weather';

describe('pazar satışı', () => {
  it('tane fiyatı: bölge çarpanı uygulanır; çöp cezası çarpansız', () => {
    expect(unitPrice('lufer', 'bogaz')).toBe(23);
    expect(unitPrice('naylon', 'marmara')).toBe(-45);
  });

  it('çeşit çarpanı her yeni tür için +%10, en fazla ×1.8', () => {
    expect(varietyMultiplier(0)).toBe(1);
    expect(varietyMultiplier(1)).toBe(1);
    expect(varietyMultiplier(4)).toBeCloseTo(1.3);
    expect(varietyMultiplier(20)).toBe(1.8);
  });

  it('kova satışı: türlerin toplamı × çeşit çarpanı − çöp cezası', () => {
    const sale = sellCatch({ hamsi: 5, lufer: 2, kalkan: 1, cizme: 2 }, 'kiyi');
    expect(sale.lines.map((l) => [l.sp, l.count, l.total])).toEqual([
      ['hamsi', 5, 15],
      ['lufer', 2, 30],
      ['kalkan', 1, 38],
      ['cizme', 2, -50],
    ]);
    expect(sale.base).toBe(83);
    expect(sale.varieties).toBe(3);
    expect(sale.multiplier).toBeCloseTo(1.2);
    expect(sale.bonus).toBe(17);
    expect(sale.penalty).toBe(50);
    expect(sale.earned).toBe(50);
  });

  it('aynı değerde ama çeşitli kova daha çok kazandırır', () => {
    const single = sellCatch({ istavrit: 6 }, 'kiyi');
    const mixed = sellCatch({ hamsi: 4, istavrit: 2, cipura: 1 }, 'kiyi');
    expect(single.base).toBe(30);
    expect(mixed.base).toBe(28);
    expect(mixed.earned).toBeGreaterThan(single.earned);
  });

  it('kazanç eksiye düşmez; boş kova sıfır', () => {
    expect(sellCatch({ naylon: 5 }, 'kiyi').earned).toBe(0);
    expect(sellCatch({}, 'kiyi')).toMatchObject({ earned: 0, varieties: 0, lines: [] });
  });

  it('pazar kedisi en pahalı balığı hedefler ve bir tane çalar', () => {
    const c = { hamsi: 5, kalkan: 1, cizme: 2 };
    expect(catTarget(sellCatch(c, 'kiyi'))).toBe('kalkan');
    expect(afterTheft(c, 'kalkan')).toEqual({ hamsi: 5, cizme: 2 });
    expect(afterTheft(c, 'hamsi')).toEqual({ hamsi: 4, kalkan: 1, cizme: 2 });
    expect(catTarget(sellCatch({ naylon: 3 }, 'kiyi'))).toBeNull();
  });
});

describe('dükkân', () => {
  it('misinalar pahalandıkça derine iner; ilk olta, misina ve yem bedava', () => {
    const depths = LINE_ORDER.map((id) => LINES[id].depth);
    expect([...depths].sort((a, b) => a - b)).toEqual(depths);
    expect(RODS.kamis.price).toBe(0);
    expect(LINES.ince.price).toBe(0);
    expect(BAITS.ekmek.price).toBe(0);
  });

  it('kademeler sırayla alınır: bir öncekine sahip olmadan atlanamaz', () => {
    const p = defaultProfile();
    p.money = 2000;
    expect(buyRod(p, 'karbon')).toBeNull();
    const withBambu = buyRod(p, 'bambu')!;
    expect(withBambu.money).toBe(1600);
    const withRod = buyRod(withBambu, 'karbon')!;
    expect(withRod.money).toBe(200);
    expect(withRod.rods.karbon).toBe(true);
    expect(withRod.rod).toBe('karbon');
    expect(buyRod(withRod, 'karbon')).toBeNull();
    expect(buyRod(withRod, 'derin')).toBeNull();
  });

  it('yem alınınca sahip olunur; sürükleyip bir iğneye takana kadar donanıma girmez', () => {
    const p = defaultProfile();
    p.money = 100;
    const withBait = buyBait(p, 'solucan');
    expect(withBait).toBeNull();
    const richer = { ...p, money: 900 };
    const b = buyBait(richer, 'solucan')!;
    expect(b.money).toBe(100);
    expect(b.baits.solucan).toBe(true);
    expect(b.baitSlots).toEqual(['ekmek']);
  });

  it('bölgeler sırayla ve parayla açılır', () => {
    const p = defaultProfile();
    p.money = 899;
    expect(canBuyZone(p, 'bogaz')).toBe(false);
    p.money = 1000;
    const next = buyZone(p, 'bogaz')!;
    expect(next.money).toBe(100);
    expect(next.zones.bogaz).toBe(true);
    const rich = { ...defaultProfile(), money: 1e9 };
    expect(canBuyZone(rich, 'cukur')).toBe(false);
    expect(canBuyZone(rich, 'kiyi')).toBe(false);
  });
});

describe('iğne sayısı ve yem yerleşimi', () => {
  it('iğne sayısı oltaya bağlıdır: ucuz olta 1, pahalı 2, en pahalısı 3 iğne taşır', () => {
    const p = defaultProfile();
    expect(p.hookCount).toBe(1);
    expect(rodHookCapacity(p)).toBe(1); // kamış olta: tek iğne
    expect(nextHookSlotPrice(p)).toBeNull(); // parası olsa da olta yetersiz
    expect(buyHookSlot({ ...p, money: 1e9 })).toBeNull();

    const withKarbon = { ...p, rod: 'karbon' as const };
    expect(rodHookCapacity(withKarbon)).toBe(2);
    expect(nextHookSlotPrice(withKarbon)).toBe(32000);
    expect(canBuyHookSlot(withKarbon)).toBe(false);

    const rich = { ...withKarbon, money: 32000 };
    const withSecond = buyHookSlot(rich)!;
    expect(withSecond.money).toBe(0);
    expect(withSecond.hookCount).toBe(2);
    expect(withSecond.baitSlots).toEqual(['ekmek', 'ekmek']);
    expect(nextHookSlotPrice(withSecond)).toBeNull(); // karbon olta 2'de tavan yapar

    const withDerin = { ...withSecond, rod: 'derin' as const, money: 95000 };
    expect(rodHookCapacity(withDerin)).toBe(3);
    const withThird = buyHookSlot(withDerin)!;
    expect(withThird.hookCount).toBe(3);
    expect(nextHookSlotPrice(withThird)).toBeNull();
    expect(buyHookSlot({ ...withThird, money: 1e9 })).toBeNull();
  });

  it('zayıf oltaya geçince fazla iğneler geçici olarak devre dışı kalır', () => {
    const withThree = { ...defaultProfile(), rod: 'derin' as const, hookCount: 3, baitSlots: ['ekmek', 'ekmek', 'ekmek'] as BaitId[] };
    expect(activeBaitSlots(withThree)).toEqual(['ekmek', 'ekmek', 'ekmek']);
    const backToKamis = { ...withThree, rod: 'kamis' as const };
    expect(activeBaitSlots(backToKamis)).toEqual(['ekmek']); // veri kaybolmaz, sadece o seferde kullanılmaz
    expect(backToKamis.baitSlots).toHaveLength(3);
  });

  it('yalnızca sahip olunan bir yem, sahip olunan bir iğneye takılabilir', () => {
    const p = defaultProfile();
    expect(setBaitSlot(p, 0, 'karides')).toBeNull(); // sahip değil
    expect(setBaitSlot(p, 1, 'ekmek')).toBeNull(); // ikinci iğne yok
    const withSolucan = buyBait({ ...p, money: 800 }, 'solucan')!;
    const withKarides = buyBait({ ...withSolucan, money: 3200 }, 'karides')!;
    const equipped = setBaitSlot(withKarides, 0, 'karides')!;
    expect(equipped.baitSlots).toEqual(['karides']);
  });
});

describe('sefer uygulama', () => {
  it('olta: para, bölge, defter ve istatistik işlenir', () => {
    const p = defaultProfile();
    p.logbook.hamsi = { count: 2 };
    const c = { hamsi: 4, lufer: 1, cizme: 2 };
    const market = sellCatch(c, 'kiyi');
    const { profile, summary } = applyTrip(p, { zone: 'kiyi', catch: c, market });
    expect(profile.money).toBe(market.earned);
    expect(profile.lastZone).toBe('kiyi');
    expect(profile.logbook).toEqual({ hamsi: { count: 6 }, lufer: { count: 1 } });
    expect(profile.stats).toEqual({ trips: 1, totalMoney: market.earned, totalFish: 5 });
    expect(summary).toEqual({ zone: 'kiyi', earned: market.earned, fish: 5, newSpecies: ['lufer'] });
  });
});

describe('hava tahmini', () => {
  it('olasılıklara uygun dağılır: çoğu güneşli, fırtına seyrek', () => {
    const rng = new Rng(11);
    const n = { gunes: 0, yagmur: 0, firtina: 0 };
    for (let i = 0; i < 4000; i++) n[rollWeather(() => rng.next())]++;
    expect(n.gunes / 4000).toBeCloseTo(0.55, 1);
    expect(n.yagmur / 4000).toBeCloseTo(0.3, 1);
    expect(n.firtina / 4000).toBeCloseTo(0.15, 1);
  });
});
