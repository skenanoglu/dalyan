import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../../src/app/save';
import { checkAchievements } from '../../src/app/achievements';

describe('başarımlar', () => {
  it('koşul sağlanınca açılır ve profile işlenir', () => {
    const p = defaultProfile();
    p.stats.trips = 1;
    const { profile, unlocked } = checkAchievements(p);
    expect(unlocked.map((a) => a.id)).toEqual(['ilk-av']);
    expect(profile.achievements['ilk-av']).toBeDefined();
  });

  it('zaten açık olan tekrar açılmaz', () => {
    const p = defaultProfile();
    p.stats.trips = 1;
    const first = checkAchievements(p).profile;
    const { unlocked } = checkAchievements(first);
    expect(unlocked).toEqual([]);
  });

  it('birden fazla koşul aynı anda sağlanırsa hepsi açılır', () => {
    const p = defaultProfile();
    p.stats.trips = 50;
    p.stats.totalFish = 1000;
    p.stats.totalMoney = 50000;
    const { unlocked } = checkAchievements(p);
    const ids = unlocked.map((a) => a.id).sort();
    expect(ids).toEqual(['bin-balik', 'elli-av', 'ilk-av', 'yuz-balik', 'zengin'].sort());
  });

  it('hiçbir koşul sağlanmazsa hiçbir şey açılmaz', () => {
    const { unlocked, profile } = checkAchievements(defaultProfile());
    expect(unlocked).toEqual([]);
    expect(profile.achievements).toEqual({});
  });
});
