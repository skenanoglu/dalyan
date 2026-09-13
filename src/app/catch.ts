import type { Catch, SpeciesId } from './types';
import { SPECIES, SPECIES_ORDER, isSpeciesId } from './species';

/** Kovadaki balık sayısı; çöpler varsayılan olarak sayılmaz. */
export function catchCount(c: Catch, includeJunk = false): number {
  let n = 0;
  for (const id of SPECIES_ORDER) {
    if (includeJunk || !SPECIES[id].junk) n += c[id] ?? 0;
  }
  return n;
}

/** Tür sırasına göre dolu girdiler. */
export function catchEntries(c: Catch): [SpeciesId, number][] {
  return SPECIES_ORDER.filter((id) => (c[id] ?? 0) > 0).map((id) => [id, c[id]!]);
}

/** "hamsi:8,lufer:3" biçimini okur; bilinmeyen türleri ve geçersiz adetleri atlar. */
export function parseCatch(raw: string | null): Catch | null {
  if (!raw) return null;
  const c: Catch = {};
  for (const part of raw.split(',')) {
    const [key, value] = part.split(':');
    const id = key?.trim() ?? '';
    const n = Math.floor(Number(value));
    if (isSpeciesId(id) && n > 0) c[id] = (c[id] ?? 0) + n;
  }
  return Object.keys(c).length > 0 ? c : null;
}
