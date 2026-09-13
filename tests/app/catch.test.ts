import { describe, expect, it } from 'vitest';
import { catchCount, parseCatch } from '../../src/app/catch';
import { RARE_PRICE, SPECIES, speciesInReach } from '../../src/app/species';
import { defaultUpgrades } from '../../src/app/upgrades';
import { fakeCatch } from '../../src/scenes/fishing/fake';
import type { FishingIn } from '../../src/app/types';

const input = (extra: Partial<FishingIn> = {}): FishingIn => ({
  zone: 'kiyi',
  upgrades: defaultUpgrades(),
  bonusSeconds: 0,
  bait: 0,
  seed: 1,
  ...extra,
});

describe('kova', () => {
  it('debug kova metnini okur, bilinmeyenleri atlar', () => {
    expect(parseCatch('hamsi:8, lufer:3,yunus:2,cizme:x,hamsi:1')).toEqual({ hamsi: 9, lufer: 3 });
    expect(parseCatch('')).toBeNull();
    expect(parseCatch('yunus:4')).toBeNull();
  });

  it('balık sayısına çöp dahil edilmez', () => {
    expect(catchCount({ hamsi: 3, naylon: 2 })).toBe(3);
    expect(catchCount({ hamsi: 3, naylon: 2 }, true)).toBe(5);
  });

  it('oltanın ulaştığı türler derinliğe göre', () => {
    const ids = speciesInReach(12).map((s) => s.id);
    expect(ids).toContain('lufer');
    expect(ids).not.toContain('mezgit');
    expect(speciesInReach(110)).toHaveLength(14);
  });
});

describe('geçici sahte av', () => {
  it('aynı seed aynı kovayı verir', () => {
    expect(fakeCatch(input({ seed: 42 }))).toEqual(fakeCatch(input({ seed: 42 })));
  });

  it('başlangıç misinası (12 m) derin türleri getirmez', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const c = fakeCatch(input({ zone: 'marmara', seed }));
      for (const id of Object.keys(c)) expect(SPECIES[id as keyof typeof SPECIES].depth[0]).toBeLessThanOrEqual(12);
    }
  });

  it('yem nadir balık payını artırır, ek süre balık sayısını artırır', () => {
    const share = (bait: number): number => {
      let rare = 0;
      let all = 0;
      for (let seed = 1; seed <= 300; seed++) {
        const c = fakeCatch(input({ zone: 'bogaz', seed, bait, upgrades: { ...defaultUpgrades(), misina: 4 } }));
        for (const [id, n] of Object.entries(c)) {
          all += n;
          if (SPECIES[id as keyof typeof SPECIES].price >= RARE_PRICE) rare += n;
        }
      }
      return rare / all;
    };
    expect(share(10)).toBeGreaterThan(share(0) + 0.05);
    const total = (bonusSeconds: number) => catchCount(fakeCatch(input({ seed: 7, bonusSeconds })), true);
    expect(total(15)).toBeGreaterThanOrEqual(total(0));
  });
});
