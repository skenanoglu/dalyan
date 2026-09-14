import { describe, expect, it } from 'vitest';
import {
  applyTrip,
  buyBait,
  buyRod,
  buyUpgrade,
  buyZone,
  canBuyZone,
  sellCatch,
  unitPrice,
  varietyMultiplier,
} from '../../src/app/progress';
import { defaultProfile } from '../../src/app/save';
import { upgradeCost, upgradeValue } from '../../src/app/upgrades';
import { BAITS, RODS, ROD_ORDER } from '../../src/app/gear';
import { afterTheft, catTarget } from '../../src/scenes/market/scene';
import { Rng } from '../../src/app/rng';
import { rollWeather } from '../../src/app/weather';

describe('pazar satışı', () => {
  it('tane fiyatı: oltada bölge çarpanı var, martıda yok; çöp cezası çarpansız', () => {
    expect(unitPrice('lufer', 'olta', 'bogaz')).toBe(68);
    expect(unitPrice('lufer', 'marti', 'bogaz')).toBe(45);
    expect(unitPrice('naylon', 'olta', 'marmara')).toBe(-8);
  });

  it('çeşit çarpanı her yeni tür için +%10, en fazla ×1.8', () => {
    expect(varietyMultiplier(0)).toBe(1);
    expect(varietyMultiplier(1)).toBe(1);
    expect(varietyMultiplier(4)).toBeCloseTo(1.3);
    expect(varietyMultiplier(20)).toBe(1.8);
  });

  it('kova satışı: türlerin toplamı × çeşit çarpanı − çöp cezası', () => {
    const sale = sellCatch({ hamsi: 5, lufer: 2, kalkan: 1, cizme: 2 }, 'olta', 'kiyi');
    expect(sale.lines.map((l) => [l.sp, l.count, l.total])).toEqual([
      ['hamsi', 5, 50],
      ['lufer', 2, 90],
      ['kalkan', 1, 120],
      ['cizme', 2, -10],
    ]);
    expect(sale.base).toBe(260);
    expect(sale.varieties).toBe(3);
    expect(sale.multiplier).toBeCloseTo(1.2);
    expect(sale.bonus).toBe(52);
    expect(sale.penalty).toBe(10);
    expect(sale.earned).toBe(302);
  });

  it('aynı değerde ama çeşitli kova daha çok kazandırır', () => {
    const single = sellCatch({ istavrit: 6 }, 'marti', 'kiyi');
    const mixed = sellCatch({ hamsi: 3, istavrit: 2, cipura: 1 }, 'marti', 'kiyi');
    expect(single.base).toBe(90);
    expect(mixed.base).toBe(80);
    expect(mixed.earned).toBeGreaterThan(single.earned);
  });

  it('kazanç eksiye düşmez; boş kova sıfır', () => {
    expect(sellCatch({ naylon: 5 }, 'marti', 'kiyi').earned).toBe(0);
    expect(sellCatch({}, 'olta', 'kiyi')).toMatchObject({ earned: 0, varieties: 0, lines: [] });
  });

  it('pazar kedisi en pahalı balığı hedefler ve bir tane çalar', () => {
    const c = { hamsi: 5, kalkan: 1, cizme: 2 };
    expect(catTarget(sellCatch(c, 'olta', 'kiyi'))).toBe('kalkan');
    expect(afterTheft(c, 'kalkan')).toEqual({ hamsi: 5, cizme: 2 });
    expect(afterTheft(c, 'hamsi')).toEqual({ hamsi: 4, kalkan: 1, cizme: 2 });
    expect(catTarget(sellCatch({ naylon: 3 }, 'marti', 'kiyi'))).toBeNull();
  });
});

describe('dükkân', () => {
  it('oltalar pahalandıkça derine iner; ilk olta ve yem bedava', () => {
    const depths = ROD_ORDER.map((id) => RODS[id].depth);
    expect([...depths].sort((a, b) => a - b)).toEqual(depths);
    expect(RODS.kamis.price).toBe(0);
    expect(BAITS.ekmek.price).toBe(0);
  });

  it('olta ve yem alınınca hemen kullanılır; sahip olunan tekrar alınmaz', () => {
    const p = defaultProfile();
    p.money = 1000;
    const withRod = buyRod(p, 'karbon')!;
    expect(withRod.money).toBe(100);
    expect(withRod.rods.karbon).toBe(true);
    expect(withRod.rod).toBe('karbon');
    expect(buyRod(withRod, 'karbon')).toBeNull();
    expect(buyRod(withRod, 'derin')).toBeNull();

    const withBait = buyBait(withRod, 'solucan');
    expect(withBait).toBeNull();
    const richer = { ...withRod, money: 200 };
    const b = buyBait(richer, 'solucan')!;
    expect(b.money).toBe(50);
    expect(b.bait).toBe('solucan');
  });

  it('martı yükseltmesi: fiyat taban × 1.8^seviye; para yetmezse ya da en üstteyse alınmaz', () => {
    expect(upgradeCost('dalis', 0)).toBe(140);
    expect(upgradeCost('dalis', 1)).toBe(252);
    expect(upgradeCost('dalis', 4)).toBeNull();
    expect(upgradeValue('nefes', 99)).toBe(3.7);

    const p = defaultProfile();
    p.money = 160;
    const next = buyUpgrade(p, 'gaga')!;
    expect(next.money).toBe(10);
    expect(next.upgrades.gaga).toBe(1);
    expect(buyUpgrade(next, 'gaga')).toBeNull();
    const rich = { ...defaultProfile(), money: 1e9 };
    rich.upgrades.simit = 2;
    expect(buyUpgrade(rich, 'simit')).toBeNull();
  });

  it('bölgeler sırayla ve parayla açılır', () => {
    const p = defaultProfile();
    p.money = 599;
    expect(canBuyZone(p, 'bogaz')).toBe(false);
    p.money = 700;
    const next = buyZone(p, 'bogaz')!;
    expect(next.money).toBe(100);
    expect(next.zones.bogaz).toBe(true);
    const rich = { ...defaultProfile(), money: 1e9 };
    expect(canBuyZone(rich, 'cukur')).toBe(false);
    expect(canBuyZone(rich, 'kiyi')).toBe(false);
  });
});

describe('sefer uygulama', () => {
  it('olta: para, bölge, defter ve istatistik işlenir', () => {
    const p = defaultProfile();
    p.logbook.hamsi = { count: 2 };
    const c = { hamsi: 4, lufer: 1, cizme: 2 };
    const market = sellCatch(c, 'olta', 'kiyi');
    const { profile, summary } = applyTrip(p, { mode: 'olta', zone: 'kiyi', catch: c, market });
    expect(profile.money).toBe(market.earned);
    expect(profile.lastMode).toBe('olta');
    expect(profile.logbook).toEqual({ hamsi: { count: 6 }, lufer: { count: 1 } });
    expect(profile.stats).toEqual({ trips: 1, totalMoney: market.earned, totalFish: 5 });
    expect(summary).toEqual({ mode: 'olta', zone: 'kiyi', earned: market.earned, fish: 5, newSpecies: ['lufer'] });
  });

  it('martı: son bölge değişmez, özet bölgesiz', () => {
    const p = defaultProfile();
    p.zones.bogaz = true;
    p.lastZone = 'bogaz';
    const c = { istavrit: 3 };
    const { profile, summary } = applyTrip(p, { mode: 'marti', zone: 'kiyi', catch: c, market: sellCatch(c, 'marti', 'kiyi') });
    expect(profile.lastZone).toBe('bogaz');
    expect(profile.lastMode).toBe('marti');
    expect(summary.zone).toBeNull();
    expect(summary.earned).toBe(45);
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
