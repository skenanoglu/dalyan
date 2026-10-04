import type { Catch, SpeciesId } from './types';
import type { Profile } from './save';
import { Rng } from './rng';
import { catchCount } from './catch';

export type QuestKind = 'species' | 'totalFish' | 'earnMoney';

export interface QuestDef {
  kind: QuestKind;
  /** Yalnızca kind 'species' için. */
  speciesId?: SpeciesId;
  target: number;
  reward: number;
}

export interface DailyQuestState extends QuestDef {
  progress: number;
  done: boolean;
}

export interface DailyState {
  /** YYYY-MM-DD; boşsa hiç oluşturulmamış demektir. */
  date: string;
  quests: DailyQuestState[];
  /** Ardışık giriş günü sayısı. */
  streak: number;
  /** Son görülen gün (YYYY-MM-DD); seri kopunca sıfırlanır. */
  lastDate: string | null;
}

export function defaultDaily(): DailyState {
  return { date: '', quests: [], streak: 0, lastDate: null };
}

/** Her gün görülebilecek görev türleri; ucuz iğneyle bile tutulabilen yaygın balıklar. */
const QUEST_SPECIES: SpeciesId[] = ['hamsi', 'istavrit', 'cipura', 'palyaco', 'levrek'];

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Kullanıcının yerel tarihini YYYY-MM-DD biçiminde döner (UTC değil). */
export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function hashDate(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) h = (Math.imul(h, 31) + date.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** Üst üste girişte artan ödül; 10. günden sonra sabitlenir. */
export function streakBonus(streak: number): number {
  return Math.min(50 + (streak - 1) * 15, 200);
}

function generateQuests(rng: Rng): DailyQuestState[] {
  const sp = rng.pick(QUEST_SPECIES);
  const spTarget = 2 + rng.int(3);
  const fishTarget = 8 + rng.int(8);
  const moneyTarget = Math.round((100 + rng.int(151)) / 10) * 10;
  const defs: QuestDef[] = [
    { kind: 'species', speciesId: sp, target: spTarget, reward: spTarget * 40 },
    { kind: 'totalFish', target: fishTarget, reward: fishTarget * 15 },
    { kind: 'earnMoney', target: moneyTarget, reward: Math.round((moneyTarget * 0.5) / 10) * 10 },
  ];
  return defs.map((d) => ({ ...d, progress: 0, done: false }));
}

/**
 * Gün değiştiyse günlük görevleri yeniler ve giriş serisini günceller; bonusu hemen bakiyeye ekler.
 * Aynı gün içinde tekrar çağrılırsa hiçbir şey değişmez (aynı referans döner).
 */
export function ensureDaily(p: Profile): Profile {
  const today = localDateStr();
  if (p.daily.date === today) return p;
  const yesterday = localDateStr(new Date(Date.now() - 86400000));
  const streak = p.daily.lastDate === yesterday ? p.daily.streak + 1 : 1;
  const bonus = streakBonus(streak);
  const quests = generateQuests(new Rng(hashDate(today)));
  return {
    ...p,
    money: p.money + bonus,
    daily: { date: today, quests, streak, lastDate: today },
  };
}

/** Sefer sonucuna göre günlük görev ilerlemesini işler; tamamlananların ödülünü döner. */
export function advanceDailyQuests(daily: DailyState, info: { catch: Catch; earned: number }): { daily: DailyState; reward: number } {
  let reward = 0;
  const quests = daily.quests.map((q): DailyQuestState => {
    if (q.done) return q;
    let gained = 0;
    if (q.kind === 'species' && q.speciesId) gained = info.catch[q.speciesId] ?? 0;
    else if (q.kind === 'totalFish') gained = catchCount(info.catch);
    else if (q.kind === 'earnMoney') gained = info.earned;
    const progress = Math.min(q.target, q.progress + gained);
    const done = progress >= q.target;
    if (done) reward += q.reward;
    return { ...q, progress, done };
  });
  return { daily: { ...daily, quests }, reward };
}
