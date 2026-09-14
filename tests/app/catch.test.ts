import { describe, expect, it } from 'vitest';
import { catchCount, parseCatch } from '../../src/app/catch';
import { SPECIES, gullReach, speciesFor, speciesInReach } from '../../src/app/species';
import { fakeCatch } from '../../src/scenes/fishing/fake';
import type { FishingIn, SpeciesId } from '../../src/app/types';

const input = (extra: Partial<FishingIn> = {}): FishingIn => ({
  zone: 'kiyi',
  rod: 'kamis',
  bait: 'ekmek',
  seed: 1,
  ...extra,
});

describe('kova ve türler', () => {
  it('debug kova metnini okur, bilinmeyenleri atlar', () => {
    expect(parseCatch('hamsi:8, lufer:3,yunus:2,cizme:x,hamsi:1')).toEqual({ hamsi: 9, lufer: 3 });
    expect(parseCatch('')).toBeNull();
    expect(parseCatch('yunus:4')).toBeNull();
  });

  it('balık sayısına çöp dahil edilmez', () => {
    expect(catchCount({ hamsi: 3, naylon: 2 })).toBe(3);
    expect(catchCount({ hamsi: 3, naylon: 2 }, true)).toBe(5);
  });

  it('olta: küçük balık sığda, büyük balık derinde', () => {
    const reach = speciesInReach(12).map((s) => s.id);
    expect(reach).toContain('hamsi');
    expect(reach).not.toContain('kalkan');
    expect(speciesInReach(110)).toHaveLength(14);
  });

  it('martı: dalış derinleştikçe büyük balıklar açılır; en derin türleri hiç tutamaz', () => {
    expect(gullReach(30).map((s) => s.id).sort()).toEqual(['hamsi', 'istavrit', 'naylon']);
    expect(gullReach(160).map((s) => s.id)).toEqual(expect.arrayContaining(['levrek', 'lufer', 'palamut', 'altin']));
    const gull = speciesFor('marti').map((s) => s.id);
    for (const deep of ['mezgit', 'kalkan', 'kilic', 'fener', 'cizme'] as SpeciesId[]) expect(gull).not.toContain(deep);
  });
});

describe('sahte avlar (test ve debug)', () => {
  it('olta: aynı seed aynı kova; kamış olta derin türleri getirmez', () => {
    expect(fakeCatch(input({ seed: 42 }))).toEqual(fakeCatch(input({ seed: 42 })));
    for (let seed = 1; seed <= 50; seed++) {
      const c = fakeCatch(input({ zone: 'marmara', seed }));
      for (const id of Object.keys(c)) expect(SPECIES[id as SpeciesId].depth[0]).toBeLessThanOrEqual(12);
    }
  });

  it('olta: yem sevdiği türleri çeker', () => {
    const liked: SpeciesId[] = ['lufer', 'mezgit', 'palamut'];
    const share = (bait: FishingIn['bait']): number => {
      let hit = 0;
      let all = 0;
      for (let seed = 1; seed <= 300; seed++) {
        const c = fakeCatch(input({ zone: 'bogaz', rod: 'karbon', bait, seed }));
        for (const [id, n] of Object.entries(c)) {
          all += n;
          if (liked.includes(id as SpeciesId)) hit += n;
        }
      }
      return hit / all;
    };
    expect(share('karides')).toBeGreaterThan(share('ekmek') + 0.1);
  });
});
