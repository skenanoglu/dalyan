import type { MarketIn, MarketOut } from '../../../app/types';
import { SPECIES, SPECIES_ORDER } from '../../../app/species';
import { upgradeValue } from '../../../app/upgrades';
import { Rng } from '../../../app/rng';
import { rotateCW } from './shapes';
import { anyPlayable, emptyBoard, idx, inBounds } from './board';
import { resolvePlacement } from './resolve';
import { buildBant, shuffleInPlace } from './bant';
import {
  ACTIVE_SLOTS,
  BOARD_CLEAR_ENERGY,
  CLEARANCE_X,
  COMBO_KEEP_MOVES,
  ENERGY_PER_CHARGE,
  MAX_ENERGY,
  POWER_COST,
  PREVIEW_COUNT,
  charges,
  comboBonus,
  energyGain,
} from './rules';
import type { Action, CellRef, CloseReason, Coord, MarketEvent, MarketState, Piece, PowerId, Source } from './types';

export interface MarketResult {
  state: MarketState;
  events: MarketEvent[];
  ok: boolean;
}

export function newMarket(input: MarketIn): MarketState {
  const rng = new Rng(input.seed | 0);
  let uid = 1;
  const size = upgradeValue('tezgah', input.upgrades.tezgah);
  const bant = buildBant(input.catch, { zone: input.zone, kova: input.upgrades.kova, rng, nextUid: () => uid++ });
  const present = new Set(bant.map((p) => p.sp));

  const s: MarketState = {
    size,
    board: emptyBoard(size),
    slots: [],
    holds: new Array(upgradeValue('dolap', input.upgrades.dolap)).fill(null),
    bant,
    zone: input.zone,
    species: SPECIES_ORDER.filter((sp) => present.has(sp) && !SPECIES[sp].junk && !SPECIES[sp].joker),
    combo: 0,
    dryMoves: 0,
    energy: Math.min(MAX_ENERGY, upgradeValue('mama', input.upgrades.mama)),
    ledger: { retail: 0, wholesale: 0, export: 0, clearance: 0, penalty: 0 },
    rng: rng.state,
    nextUid: uid,
    status: 'playing',
    closeReason: null,
  };
  while (s.slots.length < ACTIVE_SLOTS) s.slots.push(s.bant.shift() ?? null);
  evaluateStatus(s, []);
  return s;
}

export function getPiece(s: MarketState, src: Source): Piece | null {
  return (src.from === 'slot' ? s.slots[src.i] : s.holds[src.i]) ?? null;
}

export const previewPieces = (s: MarketState): Piece[] => s.bant.slice(0, PREVIEW_COUNT);

/** Bantta ve yuvalarda kalan (dolap hariç) balık sayısı. */
export const piecesLeft = (s: MarketState): number => s.bant.length + s.slots.filter(Boolean).length;

/** Kapanış öncesi satış toplamı. */
export const liveEarnings = (s: MarketState): number => s.ledger.retail + s.ledger.wholesale + s.ledger.export;

const RESCUE_ACTIONS = new Set<Action['type']>(['cat', 'swap', 'shuffle', 'close']);

/** Saf reducer: önceki durumu değiştirmez; geçersiz aksiyonda ok=false. */
export function dispatch(prev: MarketState, action: Action): MarketResult {
  const fail: MarketResult = { state: prev, events: [], ok: false };
  if (prev.status === 'closed') return fail;
  if (prev.status === 'rescue' && !RESCUE_ACTIONS.has(action.type)) return fail;

  const s = structuredClone(prev);
  const rng = new Rng(s.rng);
  const events: MarketEvent[] = [];
  if (!apply(s, rng, action, events)) return fail;
  s.rng = rng.state;
  if (s.status !== 'closed') evaluateStatus(s, events);
  return { state: s, events, ok: true };
}

/** Parça kalmadıysa ya da hiçbiri sığmıyor ve şarj yoksa pazar kapanır; şarj varsa Kurtarma. */
export function evaluateStatus(s: MarketState, events: MarketEvent[]): void {
  const hand = [...s.slots, ...s.holds];
  if (!hand.some(Boolean) && s.bant.length === 0) {
    close(s, 'empty', events);
  } else if (anyPlayable(s.board, s.size, hand)) {
    s.status = 'playing';
  } else if (charges(s.energy) >= 1) {
    s.status = 'rescue';
    events.push({ type: 'rescue' });
  } else {
    close(s, 'stuck', events);
  }
}

/** Akşam indirimi: tahtada ve elde kalan balıklar yarı fiyata satılır, çöpler ceza yazar. */
function close(s: MarketState, reason: CloseReason, events: MarketEvent[]): void {
  let clearance = 0;
  let penalty = 0;
  const settle = (v: number): void => {
    if (v >= 0) clearance += v * CLEARANCE_X;
    else penalty -= v;
  };
  for (const c of s.board) if (c) settle(c.v);
  for (const p of [...s.slots, ...s.holds, ...s.bant]) if (p) settle(p.value);

  s.ledger.clearance += clearance;
  s.ledger.penalty += penalty;
  s.status = 'closed';
  s.closeReason = reason;
  events.push({ type: 'closed', reason, clearance, penalty });
}

export function marketOut(s: MarketState): MarketOut {
  const l = s.ledger;
  const r = Math.round;
  return {
    retail: r(l.retail),
    wholesale: r(l.wholesale),
    export: r(l.export),
    clearance: r(l.clearance),
    penalty: r(l.penalty),
    earned: Math.max(0, r(l.retail + l.wholesale + l.export + l.clearance - l.penalty)),
  };
}

function spend(s: MarketState, power: PowerId): boolean {
  const cost = POWER_COST[power];
  if (charges(s.energy) < cost) return false;
  s.energy -= cost * ENERGY_PER_CHARGE;
  return true;
}

function takeSlot(s: MarketState, i: number): void {
  s.slots.splice(i, 1);
  s.slots.push(s.bant.shift() ?? null);
}

function centroid(cells: Coord[]): Coord {
  let x = 0;
  let y = 0;
  for (const c of cells) {
    x += c.x + 0.5;
    y += c.y + 0.5;
  }
  return { x: x / cells.length, y: y / cells.length };
}

function apply(s: MarketState, rng: Rng, a: Action, ev: MarketEvent[]): boolean {
  switch (a.type) {
    case 'rotate': {
      const p = getPiece(s, a.src);
      if (!p) return false;
      p.cells = rotateCW(p.cells);
      ev.push({ type: 'rotated', uid: p.uid });
      return true;
    }
    case 'place':
      return place(s, a.src, a.x, a.y, ev);
    case 'hold': {
      if (a.hold < 0 || a.hold >= s.holds.length || a.slot < 0 || a.slot >= s.slots.length) return false;
      const p = s.slots[a.slot];
      const h = s.holds[a.hold];
      if (p && !h) {
        s.holds[a.hold] = p;
        takeSlot(s, a.slot);
        ev.push({ type: 'held', uid: p.uid, swapped: false }, { type: 'shift' });
      } else if (p && h) {
        s.slots[a.slot] = h;
        s.holds[a.hold] = p;
        ev.push({ type: 'held', uid: p.uid, swapped: true });
      } else if (!p && h) {
        s.slots[a.slot] = h;
        s.holds[a.hold] = null;
        ev.push({ type: 'held', uid: h.uid, swapped: true });
      } else {
        return false;
      }
      return true;
    }
    case 'cat': {
      if (!inBounds(s.size, a.x, a.y)) return false;
      const i = idx(s.size, a.x, a.y);
      const crate = s.board[i];
      if (!crate || !spend(s, 'cat')) return false;
      ev.push({ type: 'cat', cell: { x: a.x, y: a.y, crate } });
      s.board[i] = null;
      return true;
    }
    case 'swap': {
      const p = getPiece(s, a.src);
      if (!p || p.sp === a.sp || !s.species.includes(a.sp) || !spend(s, 'swap')) return false;
      p.sp = a.sp;
      // Çöp, takasla cezasız ama değersiz bir kasaya döner.
      if (p.value < 0) p.value = 0;
      ev.push({ type: 'swap', uid: p.uid, sp: a.sp });
      return true;
    }
    case 'shuffle': {
      if (!spend(s, 'shuffle')) return false;
      const pool = [...s.slots.filter((p): p is Piece => p !== null), ...s.bant];
      shuffleInPlace(pool, rng);
      s.slots = pool.splice(0, ACTIVE_SLOTS);
      while (s.slots.length < ACTIVE_SLOTS) s.slots.push(null);
      s.bant = pool;
      ev.push({ type: 'shuffle' });
      return true;
    }
    case 'close':
      close(s, 'manual', ev);
      return true;
  }
}

function place(s: MarketState, src: Source, x: number, y: number, ev: MarketEvent[]): boolean {
  const p = getPiece(s, src);
  if (!p) return false;
  const r = resolvePlacement(s.board, s.size, p, x, y);
  if (!r) return false;

  s.board = r.after;
  ev.push({ type: 'placed', cells: r.placed });

  if (r.cleared > 0) {
    s.combo++;
    s.dryMoves = 0;
    const lines = r.rows.length + r.cols.length;
    if (lines > 0) ev.push({ type: 'lines', rows: r.rows, cols: r.cols, cells: r.lineCells });
    for (const g of r.groups) ev.push({ type: 'wholesale', sp: g.sp, cells: g.cells, export: g.export });
    if (r.ring.length > 0) ev.push({ type: 'ring', cells: r.ring });

    const bonus = comboBonus(s.combo);
    s.ledger.retail += r.sales.retail * bonus;
    s.ledger.wholesale += r.sales.wholesale * bonus;
    s.ledger.export += r.sales.export * bonus;
    const amount = (r.sales.retail + r.sales.wholesale + r.sales.export) * bonus;

    if (s.combo >= 2) ev.push({ type: 'combo', combo: s.combo });
    const soldCells: CellRef[] = [...r.lineCells, ...r.groups.flatMap((g) => g.cells), ...r.ring];
    if (amount > 0) ev.push({ type: 'sale', amount, at: centroid(soldCells) });

    const before = charges(s.energy);
    let gain = energyGain({
      lines,
      groups: r.groups.length,
      exports: r.groups.filter((g) => g.export).length,
      combo: s.combo,
    });
    if (r.boardClear) {
      gain += BOARD_CLEAR_ENERGY;
      ev.push({ type: 'boardClear' });
    }
    s.energy = Math.min(MAX_ENERGY, s.energy + gain);
    ev.push({ type: 'energy', amount: gain, charges: charges(s.energy), chargedUp: charges(s.energy) > before });
  } else {
    s.dryMoves++;
    if (s.dryMoves >= COMBO_KEEP_MOVES) s.combo = 0;
  }

  if (src.from === 'hold') {
    s.holds[src.i] = null;
  } else {
    takeSlot(s, src.i);
    ev.push({ type: 'shift' });
  }
  return true;
}

