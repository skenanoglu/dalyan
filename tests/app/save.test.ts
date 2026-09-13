import { describe, expect, it } from 'vitest';
import { defaultProfile, parseProfile } from '../../src/app/save';

describe('kayıt', () => {
  it('kayıt yoksa varsayılan profil: sadece kıyı açık', () => {
    const p = parseProfile(null);
    expect(p).toEqual(defaultProfile());
    expect(p.zones).toEqual({ kiyi: true, bogaz: false, cukur: false, marmara: false });
    expect(p.upgrades.tezgah).toBe(0);
  });

  it('bozuk kayıt varsayılana döner', () => {
    expect(parseProfile('{bozuk')).toEqual(defaultProfile());
    expect(parseProfile('[1,2]')).toEqual(defaultProfile());
    expect(parseProfile('"yazi"')).toEqual(defaultProfile());
  });

  it('eksik alanlar doldurulur, geçersiz değerler temizlenir', () => {
    const p = parseProfile(
      JSON.stringify({
        money: 1234.7,
        character: 'kedi',
        upgrades: { misina: 99, kova: -3 },
        zones: { bogaz: true, kiyi: false },
        visited: { bogaz: true, cukur: true },
        lastZone: 'marmara',
        logbook: { hamsi: { count: 5 }, yunus: { count: 2 }, lufer: { count: 0 } },
        settings: { sound: 'evet' },
      }),
    );
    expect(p.money).toBe(1234);
    expect(p.character).toBe('balik');
    expect(p.upgrades.misina).toBe(6);
    expect(p.upgrades.kova).toBe(0);
    expect(p.zones.kiyi).toBe(true);
    expect(p.zones.bogaz).toBe(true);
    expect(p.visited.bogaz).toBe(true);
    // Açık olmayan bölgeye varılmış sayılmaz, kilitli bölge son bölge olamaz.
    expect(p.visited.cukur).toBe(false);
    expect(p.lastZone).toBe('kiyi');
    expect(p.logbook).toEqual({ hamsi: { count: 5 } });
    expect(p.settings.sound).toBe(true);
  });

  it('kaydedilen profil aynen geri okunur', () => {
    const p = defaultProfile();
    p.money = 50;
    p.character = 'marti';
    p.zones.bogaz = true;
    p.visited.bogaz = true;
    p.lastZone = 'bogaz';
    p.upgrades.misina = 2;
    p.logbook.lufer = { count: 3 };
    p.settings.colorblind = true;
    p.stats = { trips: 4, totalMoney: 900, totalFish: 41 };
    expect(parseProfile(JSON.stringify(p))).toEqual(p);
  });
});
