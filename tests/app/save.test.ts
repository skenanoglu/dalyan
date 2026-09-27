import { describe, expect, it } from 'vitest';
import { defaultProfile, parseProfile } from '../../src/app/save';

describe('kayıt', () => {
  it('kayıt yoksa varsayılan profil: kıyı, kamış olta ve ekmek', () => {
    const p = parseProfile(null);
    expect(p).toEqual(defaultProfile());
    expect(p.zones).toEqual({ kiyi: true, bogaz: false, cukur: false, marmara: false });
    expect(p.rod).toBe('kamis');
    expect(p.baitSlots).toEqual(['ekmek']);
  });

  it('bozuk kayıt varsayılana döner', () => {
    expect(parseProfile('{bozuk')).toEqual(defaultProfile());
    expect(parseProfile('[1,2]')).toEqual(defaultProfile());
    expect(parseProfile('"yazi"')).toEqual(defaultProfile());
  });

  it('eski sürüm alanları atılır, geçersiz değerler temizlenir', () => {
    const p = parseProfile(
      JSON.stringify({
        v: 1,
        money: 1234.7,
        character: 'marti',
        zones: { bogaz: true, kiyi: false },
        rods: { karbon: true, kamis: false, uzay: true },
        rod: 'derin',
        baits: { karides: true },
        hookCount: 99,
        baitSlots: ['yunus'],
        lastZone: 'marmara',
        logbook: { hamsi: { count: 5 }, yunus: { count: 2 }, lufer: { count: 0 } },
        settings: { sound: 'evet', colorblind: true },
      }),
    );
    expect(p.money).toBe(1234);
    expect(p).not.toHaveProperty('character');
    expect(p.zones.kiyi).toBe(true);
    expect(p.zones.bogaz).toBe(true);
    expect(p.rods).toEqual({ kamis: true, bambu: false, karbon: true, makarali: false, derin: false });
    // Sahip olunmayan olta seçilemez.
    expect(p.rod).toBe('kamis');
    expect(p.baits).toMatchObject({ ekmek: true, karides: true });
    // İğne sayısı 3'e sıkıştırılır; geçersiz yem yerine sahip olunan yem (ekmek) konur.
    expect(p.hookCount).toBe(3);
    expect(p.baitSlots).toEqual(['ekmek', 'ekmek', 'ekmek']);
    expect(p.lastZone).toBe('kiyi');
    expect(p.logbook).toEqual({ hamsi: { count: 5 } });
    expect(p.settings).toEqual({ sound: true, haptics: true });
  });

  it('kaydedilen profil aynen geri okunur', () => {
    const p = defaultProfile();
    p.money = 50;
    p.zones.bogaz = true;
    p.lastZone = 'bogaz';
    p.rods.bambu = true;
    p.rod = 'bambu';
    p.baits.solucan = true;
    p.baitSlots = ['solucan'];
    p.logbook.lufer = { count: 3 };
    p.settings.sound = false;
    p.night = true;
    p.stats = { trips: 4, totalMoney: 900, totalFish: 41 };
    expect(parseProfile(JSON.stringify(p))).toEqual(p);
  });
});
