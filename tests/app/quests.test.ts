import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultProfile } from '../../src/app/save';
import { advanceDailyQuests, ensureDaily, streakBonus } from '../../src/app/quests';

const setDate = (iso: string): void => {
  vi.setSystemTime(new Date(iso));
};

describe('günlük görevler ve giriş serisi', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ilk girişte 3 görev oluşturur, seri 1 olur ve bonus bakiyeye eklenir', () => {
    setDate('2026-01-10T09:00:00');
    const p = defaultProfile();
    const next = ensureDaily(p);
    expect(next.daily.date).toBe('2026-01-10');
    expect(next.daily.quests).toHaveLength(3);
    expect(next.daily.streak).toBe(1);
    expect(next.money).toBe(p.money + streakBonus(1));
  });

  it('aynı gün tekrar çağrılırsa hiçbir şey değişmez (aynı referans)', () => {
    setDate('2026-01-10T09:00:00');
    const p = ensureDaily(defaultProfile());
    setDate('2026-01-10T22:00:00');
    expect(ensureDaily(p)).toBe(p);
  });

  it('ertesi gün girilirse seri artar', () => {
    setDate('2026-01-10T09:00:00');
    let p = ensureDaily(defaultProfile());
    expect(p.daily.streak).toBe(1);
    setDate('2026-01-11T08:00:00');
    p = ensureDaily(p);
    expect(p.daily.streak).toBe(2);
    expect(streakBonus(2)).toBeGreaterThan(streakBonus(1));
  });

  it('bir gün atlanırsa seri sıfırdan başlar', () => {
    setDate('2026-01-10T09:00:00');
    let p = ensureDaily(defaultProfile());
    setDate('2026-01-13T09:00:00');
    p = ensureDaily(p);
    expect(p.daily.streak).toBe(1);
  });

  it('görev hedefine ulaşınca bir kez ödül verir, tekrar vermez', () => {
    setDate('2026-01-10T09:00:00');
    const p = ensureDaily(defaultProfile());
    const speciesQuest = p.daily.quests.find((q) => q.kind === 'species')!;
    const first = advanceDailyQuests(p.daily, { catch: { [speciesQuest.speciesId!]: speciesQuest.target }, earned: 0 });
    expect(first.reward).toBe(speciesQuest.reward);
    const q1 = first.daily.quests.find((q) => q.kind === 'species')!;
    expect(q1.done).toBe(true);
    expect(q1.progress).toBe(speciesQuest.target);

    const second = advanceDailyQuests(first.daily, { catch: { [speciesQuest.speciesId!]: 1 }, earned: 0 });
    expect(second.reward).toBe(0);
  });

  it('ilerleme hedefi aşmaz', () => {
    setDate('2026-01-10T09:00:00');
    const p = ensureDaily(defaultProfile());
    const fishQuest = p.daily.quests.find((q) => q.kind === 'totalFish')!;
    const { daily } = advanceDailyQuests(p.daily, { catch: { hamsi: fishQuest.target + 50 }, earned: 0 });
    const q = daily.quests.find((x) => x.kind === 'totalFish')!;
    expect(q.progress).toBe(fishQuest.target);
  });
});
