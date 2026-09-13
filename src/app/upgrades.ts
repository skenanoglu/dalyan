import type { UpgradeId, Upgrades } from './types';

export type UpgradeGroup = 'olta' | 'tezgah' | 'tekne';

export interface UpgradeDef {
  name: string;
  group: UpgradeGroup;
  desc: string;
  /** Seviye başına değer; ilk eleman 0. seviye. */
  levels: number[];
  /** Fiyat: base × 1.8^mevcutSeviye (Balık Avı'daki formül). */
  base: number;
  format: (v: number) => string;
}

const times = (v: number): string => `×${v.toFixed(2).replace(/\.?0+$/, '')}`;

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  // Olta: Balık Avı'ndan aynen
  misina: { name: 'Misina', group: 'olta', desc: 'Oltanın inebildiği derinlik', levels: [12, 18, 26, 38, 55, 80, 110], base: 120, format: (v) => `${v} m` },
  kursun: { name: 'Kurşun', group: 'olta', desc: 'Oltanın iniş hızı', levels: [190, 230, 270, 310, 350, 400], base: 100, format: (v) => `${v} px/sn` },
  makara: { name: 'Makara', group: 'olta', desc: 'Balığı çekme hızı', levels: [1, 1.15, 1.32, 1.52, 1.75, 2], base: 110, format: times },
  kova: { name: 'Kova', group: 'olta', desc: 'Kasa fiyat çarpanı', levels: [1, 1.1, 1.2, 1.3, 1.4, 1.5], base: 160, format: times },
  // Tezgâh: pazar
  tezgah: { name: 'Tezgâh', group: 'tezgah', desc: 'Pazar tahtasının boyu', levels: [7, 8, 9], base: 400, format: (v) => `${v}×${v}` },
  dolap: { name: 'Soğuk Dolap', group: 'tezgah', desc: 'Kenara ayırabileceğin kasa', levels: [1, 2], base: 900, format: (v) => `${v} yer` },
  mama: { name: 'Kedi Maması', group: 'tezgah', desc: 'Pazara başlarken kalabalık', levels: [0, 10, 20, 30], base: 300, format: (v) => `${v / 10} şarj` },
  // Tekne: yolculuk
  motor: { name: 'Motor', group: 'tekne', desc: 'Yolculuk mesafesi', levels: [1, 0.85, 0.7], base: 500, format: times },
  durbun: { name: 'Dürbün', group: 'tekne', desc: 'Varış bonusu', levels: [1, 1.25, 1.5], base: 450, format: times },
};

export const UPGRADE_ORDER: UpgradeId[] = ['misina', 'kursun', 'makara', 'kova', 'tezgah', 'dolap', 'mama', 'motor', 'durbun'];

export const GROUP_NAMES: Record<UpgradeGroup, string> = { olta: 'Olta', tezgah: 'Tezgâh', tekne: 'Tekne' };

export const maxLevel = (id: UpgradeId): number => UPGRADES[id].levels.length - 1;

export function upgradeValue(id: UpgradeId, level: number): number {
  const { levels } = UPGRADES[id];
  return levels[Math.max(0, Math.min(level, levels.length - 1))];
}

/** Sonraki seviyenin fiyatı; en üst seviyedeyse null. */
export function upgradeCost(id: UpgradeId, level: number): number | null {
  if (level >= maxLevel(id)) return null;
  return Math.round(UPGRADES[id].base * 1.8 ** level);
}

export function defaultUpgrades(): Upgrades {
  return Object.fromEntries(UPGRADE_ORDER.map((id) => [id, 0])) as Upgrades;
}
