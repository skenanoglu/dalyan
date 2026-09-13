import type { UpgradeId, Upgrades } from './types';

export interface UpgradeDef {
  name: string;
  desc: string;
  /** Seviye başına değer; ilk eleman 0. seviye. */
  levels: number[];
  /** Fiyat: base × 1.8^mevcutSeviye (Balık Avı'daki formül). */
  base: number;
  format: (v: number) => string;
}

/** Martı yükseltmeleri. Olta tarafı olta ve yem tipleriyle gelişir (gear.ts). */
export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  dalis: { name: 'Dalış', desc: 'Pikeyle inebildiği derinlik; büyük balıklar derinde', levels: [30, 55, 85, 120, 160], base: 140, format: (v) => `${v} px` },
  nefes: { name: 'Nefes', desc: 'Su altında kalma süresi', levels: [1.5, 1.9, 2.4, 3, 3.7], base: 130, format: (v) => `${v} sn` },
  gaga: { name: 'Gaga', desc: 'Balığı kapma mesafesi', levels: [16, 20, 24, 29, 34], base: 150, format: (v) => `${v} px` },
  simit: { name: 'Can Simidi', desc: 'Çarpışmayı affeder', levels: [0, 1, 2], base: 600, format: (v) => (v === 0 ? 'yok' : `${v} tane`) },
};

export const UPGRADE_ORDER: UpgradeId[] = ['dalis', 'nefes', 'gaga', 'simit'];

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
