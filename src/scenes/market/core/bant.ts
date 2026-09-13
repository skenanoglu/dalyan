import type { Catch, SpeciesId, ZoneId } from '../../../app/types';
import { SPECIES, SPECIES_ORDER } from '../../../app/species';
import { fishValue } from '../../../app/progress';
import type { Rng } from '../../../app/rng';
import { rotations, shapeById } from './shapes';
import { CHEAP_X, MIN_PIECES } from './rules';
import type { Piece } from './types';

/** Kova küçük gelirse bandı tamamlayan tür. */
export const FILLER: SpeciesId = 'hamsi';

export function shuffleInPlace<T>(items: T[], rng: Rng): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
}

export interface PieceOptions {
  zone: ZoneId;
  kova: number;
  cheap: boolean;
  uid: number;
  rng: Rng;
}

/** Türüne göre şekli seçilmiş, rastgele döndürülmüş bir balık. */
export function makePiece(sp: SpeciesId, o: PieceOptions): Piece {
  const shapeId = o.rng.pick(SPECIES[sp].shapes);
  const rots = rotations(shapeById(shapeId).cells);
  const value = fishValue(sp, o.zone, o.kova);
  return {
    uid: o.uid,
    sp,
    shapeId,
    cells: rots[o.rng.int(rots.length)],
    value: o.cheap ? value * CHEAP_X : value,
    cheap: o.cheap,
  };
}

/** Kovadaki her balık bir parça olur; eksikse toptancı hamsisiyle tamamlanır, sonra karıştırılır. */
export function buildBant(
  c: Catch,
  o: { zone: ZoneId; kova: number; rng: Rng; nextUid: () => number },
  minPieces = MIN_PIECES,
): Piece[] {
  const pieces: Piece[] = [];
  const add = (sp: SpeciesId, cheap: boolean): void => {
    pieces.push(makePiece(sp, { zone: o.zone, kova: o.kova, cheap, uid: o.nextUid(), rng: o.rng }));
  };
  for (const sp of SPECIES_ORDER) {
    for (let i = 0; i < (c[sp] ?? 0); i++) add(sp, false);
  }
  while (pieces.length < minPieces) add(FILLER, true);
  shuffleInPlace(pieces, o.rng);
  return pieces;
}
