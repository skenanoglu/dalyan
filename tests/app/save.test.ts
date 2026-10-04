import { describe, expect, it } from 'vitest';
import { defaultProfile, parseProfile, type Profile } from '../../src/app/save';

// referral.code her defaultProfile() çağrısında rastgele üretilir; karşılaştırmadan önce sabitlenir.
const sameCode = (p: Profile): Profile => ({ ...p, referral: { ...p.referral, code: 'X' } });

describe('kayıt', () => {
  it('kayıt yoksa varsayılan profil: kıyı, kamış olta ve ekmek', () => {
    const p = parseProfile(null);
    expect(sameCode(p)).toEqual(sameCode(defaultProfile()));
    expect(p.zones).toEqual({ kiyi: true, bogaz: false, cukur: false, marmara: false });
    expect(p.rod).toBe('kamis');
    expect(p.baitSlots).toEqual(['ekmek']);
  });

  it('bozuk kayıt varsayılana döner', () => {
    expect(sameCode(parseProfile('{bozuk'))).toEqual(sameCode(defaultProfile()));
    expect(sameCode(parseProfile('[1,2]'))).toEqual(sameCode(defaultProfile()));
    expect(sameCode(parseProfile('"yazi"'))).toEqual(sameCode(defaultProfile()));
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
    p.achievements = { 'ilk-av': { unlockedAt: 1700000000000 } };
    p.referral = { code: p.referral.code, sharedBonusClaimed: true, referredBy: 'ABCDEF' };
    expect(parseProfile(JSON.stringify(p))).toEqual(p);
  });

  it('geçersiz başarım kimlikleri ve bozuk tarihler atılır', () => {
    const p = parseProfile(
      JSON.stringify({ achievements: { 'ilk-av': { unlockedAt: 123 }, uydurma: { unlockedAt: 999 }, zengin: { unlockedAt: 'x' } } }),
    );
    expect(p.achievements).toEqual({ 'ilk-av': { unlockedAt: 123 } });
  });
});
