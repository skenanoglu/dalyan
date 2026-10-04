import type { Profile } from './save';
import { SPECIES, SPECIES_ORDER } from './species';
import { BOAT_ORDER, ROD_ORDER } from './gear';

export type AchievementId =
  | 'ilk-av'
  | 'ilk-kopekbaligi'
  | 'koleksiyoncu'
  | 'elli-av'
  | 'yuz-balik'
  | 'bin-balik'
  | 'zengin'
  | 'tam-donanim'
  | 'uc-igne'
  | 'amiral-gemisi';

export interface Achievement {
  id: AchievementId;
  name: string;
  icon: string;
  desc: string;
  check: (p: Profile) => boolean;
}

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  'ilk-av': { id: 'ilk-av', name: 'İlk Av', icon: '🎣', desc: 'İlk seferini tamamla', check: (p) => p.stats.trips >= 1 },
  'ilk-kopekbaligi': { id: 'ilk-kopekbaligi', name: 'Köpekbalığı Avcısı', icon: '🦈', desc: 'Bir köpekbalığı yakala', check: (p) => Boolean(p.logbook.kopekbaligi) },
  koleksiyoncu: {
    id: 'koleksiyoncu',
    name: 'Koleksiyoncu',
    icon: '📖',
    desc: 'Tüm türleri deftere işle',
    check: (p) => SPECIES_ORDER.filter((id) => !SPECIES[id].junk).every((id) => p.logbook[id]),
  },
  'elli-av': { id: 'elli-av', name: '50 Sefer', icon: '⛵', desc: '50 av seferi tamamla', check: (p) => p.stats.trips >= 50 },
  'yuz-balik': { id: 'yuz-balik', name: '100 Balık', icon: '🐟', desc: 'Toplam 100 balık tut', check: (p) => p.stats.totalFish >= 100 },
  'bin-balik': { id: 'bin-balik', name: '1000 Balık', icon: '🐠', desc: 'Toplam 1000 balık tut', check: (p) => p.stats.totalFish >= 1000 },
  zengin: { id: 'zengin', name: 'Varlıklı Balıkçı', icon: '💰', desc: 'Toplamda 50.000₺ kazan', check: (p) => p.stats.totalMoney >= 50000 },
  'tam-donanim': { id: 'tam-donanim', name: 'Tam Donanım', icon: '🛠️', desc: 'Tüm oltalara sahip ol', check: (p) => ROD_ORDER.every((id) => p.rods[id]) },
  'uc-igne': { id: 'uc-igne', name: 'Üç İğneli', icon: '🪝', desc: 'Oltana 3. iğneyi tak', check: (p) => p.hookCount >= 3 },
  'amiral-gemisi': { id: 'amiral-gemisi', name: 'Amiral Gemisi', icon: '🚢', desc: 'En büyük tekneye sahip ol', check: (p) => p.boats[BOAT_ORDER[BOAT_ORDER.length - 1]] },
};

export const ACHIEVEMENT_ORDER: AchievementId[] = [
  'ilk-av',
  'ilk-kopekbaligi',
  'koleksiyoncu',
  'elli-av',
  'yuz-balik',
  'bin-balik',
  'zengin',
  'tam-donanim',
  'uc-igne',
  'amiral-gemisi',
];

/** Henüz açılmamış başarımları kontrol eder; açılanları işler ve döner. */
export function checkAchievements(p: Profile): { profile: Profile; unlocked: Achievement[] } {
  const unlocked: Achievement[] = [];
  const achievements = { ...p.achievements };
  for (const id of ACHIEVEMENT_ORDER) {
    if (achievements[id]) continue;
    const a = ACHIEVEMENTS[id];
    if (a.check(p)) {
      achievements[id] = { unlockedAt: Date.now() };
      unlocked.push(a);
    }
  }
  if (unlocked.length === 0) return { profile: p, unlocked };
  return { profile: { ...p, achievements }, unlocked };
}
