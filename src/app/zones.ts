import type { ZoneId } from './types';

export interface Zone {
  id: ZoneId;
  name: string;
  /** Bölgenin en derin noktası (metre). */
  depth: number;
  /** Açma fiyatı (₺). */
  price: number;
  /** Bu bölgeden gelen kasaların fiyat çarpanı. */
  priceMultiplier: number;
  /** Avda aynı anda görülebilecek en fazla balık. */
  maxFish: number;
  /** Yolculukta varış için geçilecek engel sayısı. */
  voyageTarget: number;
}

// Derinlik, fiyat ve çarpanlar Balık Avı'nın BOLGELER tablosundan.
export const ZONES: Record<ZoneId, Zone> = {
  kiyi: { id: 'kiyi', name: 'Sarayburnu Kıyısı', depth: 20, price: 0, priceMultiplier: 1, maxFish: 14, voyageTarget: 10 },
  bogaz: { id: 'bogaz', name: 'Boğaz Akıntısı', depth: 40, price: 900, priceMultiplier: 1.5, maxFish: 20, voyageTarget: 20 },
  cukur: { id: 'cukur', name: 'Derin Çukur', depth: 70, price: 5400, priceMultiplier: 2.2, maxFish: 26, voyageTarget: 30 },
  marmara: { id: 'marmara', name: 'Marmara Dibi', depth: 110, price: 21000, priceMultiplier: 3.2, maxFish: 32, voyageTarget: 40 },
};

export const ZONE_ORDER: ZoneId[] = ['kiyi', 'bogaz', 'cukur', 'marmara'];

export const isZoneId = (v: string): v is ZoneId => v in ZONES;
