import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/app/rng';
import { defaultUpgrades } from '../../src/app/upgrades';
import { fishValue } from '../../src/app/progress';
import { buildBant } from '../../src/scenes/market/core/bant';
import { dispatch, evaluateStatus, marketOut, newMarket } from '../../src/scenes/market/core/market';
import { MIN_PIECES } from '../../src/scenes/market/core/rules';
import type { MarketEvent, MarketState, Piece } from '../../src/scenes/market/core/types';
import { grid, market, piece } from './helpers';

const types = (ev: MarketEvent[]) => ev.map((e) => e.type);
const multiset = (ps: (Piece | null)[]) => ps.filter(Boolean).map((p) => p!.uid).sort((a, b) => a - b);

/** Sadece (0,0), (1,0) ve (1,1) boş; hiçbir sıra dolu değil, küme yok. */
function nearlyFull(size: number): MarketState['board'] {
  const rows = Array.from({ length: size }, (_, y) => (y % 2 ? 'lh' : 'hl').repeat(size).slice(0, size));
  rows[0] = '..' + rows[0].slice(2);
  rows[1] = 'h.' + rows[1].slice(2);
  return grid(size, rows);
}

describe('bant', () => {
  it('kovadaki her balık bir parça; eksik toptancı hamsisiyle yarı fiyata tamamlanır', () => {
    let uid = 1;
    const bant = buildBant({ lufer: 3, kilic: 1, cizme: 2 }, { zone: 'bogaz', kova: 0, rng: new Rng(9), nextUid: () => uid++ });
    expect(bant).toHaveLength(MIN_PIECES);
    expect(bant.filter((p) => p.sp === 'lufer')).toHaveLength(3);
    expect(bant.find((p) => p.sp === 'kilic')!.cells).toHaveLength(5);
    expect(bant.find((p) => p.sp === 'lufer')!.value).toBe(fishValue('lufer', 'bogaz', 0));
    expect(bant.find((p) => p.sp === 'cizme')!.value).toBe(-5);
    const cheap = bant.filter((p) => p.cheap);
    expect(cheap).toHaveLength(14);
    expect(cheap.every((p) => p.sp === 'hamsi' && p.value === fishValue('hamsi', 'bogaz', 0) / 2)).toBe(true);
  });

  it('büyük kovada dolgu yok; aynı seed aynı bant', () => {
    const make = () => {
      let uid = 1;
      return buildBant({ hamsi: 25 }, { zone: 'kiyi', kova: 0, rng: new Rng(4), nextUid: () => uid++ });
    };
    expect(make()).toHaveLength(25);
    expect(make().some((p) => p.cheap)).toBe(false);
    expect(make()).toEqual(make());
  });
});

describe('pazar kurulumu', () => {
  it('tezgâh, dolap ve kedi maması yükseltmeleri', () => {
    const base = { catch: { hamsi: 4, lufer: 2, altin: 1, naylon: 1 }, zone: 'kiyi' as const, seed: 1 };
    const s0 = newMarket({ ...base, upgrades: defaultUpgrades() });
    expect(s0.size).toBe(7);
    expect(s0.board).toHaveLength(49);
    expect(s0.holds).toEqual([null]);
    expect(s0.energy).toBe(0);
    expect(s0.slots).toHaveLength(3);
    expect(s0.bant).toHaveLength(MIN_PIECES - 3);
    expect(s0.species).toEqual(['hamsi', 'lufer']);

    const s2 = newMarket({ ...base, upgrades: { ...defaultUpgrades(), tezgah: 2, dolap: 1, mama: 3 } });
    expect(s2.size).toBe(9);
    expect(s2.holds).toEqual([null, null]);
    expect(s2.energy).toBe(30);
  });
});

describe('hamleler', () => {
  it('yerleştirme banttan yeni parça getirir; satış kasaya yazılır', () => {
    const s = market(7);
    s.board = grid(7, ['ililil.', '', '', '', '', '', 'h'], 10);
    s.slots[0] = piece('hamsi', 'dot', 10);
    const nextUid = s.bant[0].uid;
    const r = dispatch(s, { type: 'place', src: { from: 'slot', i: 0 }, x: 6, y: 0 });
    expect(r.ok).toBe(true);
    expect(r.state.ledger.retail).toBe(70);
    expect(r.state.slots[2]!.uid).toBe(nextUid);
    expect(r.state.energy).toBe(1);
    expect(types(r.events)).toEqual(expect.arrayContaining(['placed', 'lines', 'sale', 'shift']));
  });

  it('kombo satışları artırır, 3 satışsız hamlede biter', () => {
    let s = market(7);
    s.board = grid(7, ['ililil.', 'lilili.'], 10);
    const play = (st: MarketState, x: number, y: number) => {
      const prepared = structuredClone(st);
      prepared.slots[0] = piece('hamsi', 'dot', 10);
      return dispatch(prepared, { type: 'place', src: { from: 'slot', i: 0 }, x, y }).state;
    };
    s = play(s, 6, 0);
    s = play(s, 6, 1);
    expect(s.combo).toBe(2);
    expect(s.ledger.retail).toBe(70 + 77);
    s = play(s, 0, 4);
    s = play(s, 2, 4);
    s = play(s, 4, 4);
    expect(s.combo).toBe(0);
  });

  it('dolap: boşsa ayırır ve bant kayar, doluysa yer değiştirir, dolaptan doğrudan yerleşir', () => {
    const s = market(7);
    const [a, b, c] = s.slots.map((p) => p!.uid);
    const r1 = dispatch(s, { type: 'hold', slot: 0, hold: 0 });
    expect(r1.state.holds[0]!.uid).toBe(a);
    expect(r1.state.slots.map((p) => p!.uid).slice(0, 2)).toEqual([b, c]);
    const r2 = dispatch(r1.state, { type: 'hold', slot: 1, hold: 0 });
    expect(r2.state.holds[0]!.uid).toBe(c);
    expect(r2.state.slots[1]!.uid).toBe(a);
    const r3 = dispatch(r2.state, { type: 'place', src: { from: 'hold', i: 0 }, x: 0, y: 0 });
    expect(r3.ok).toBe(true);
    expect(r3.state.holds[0]).toBeNull();
    expect(dispatch(s, { type: 'hold', slot: 0, hold: 1 }).ok).toBe(false);
  });
});

describe('güçler', () => {
  it('şarj yoksa kullanılamaz', () => {
    const s = market(7);
    s.board = grid(7, ['c']);
    expect(dispatch(s, { type: 'cat', x: 0, y: 0 }).ok).toBe(false);
  });

  it('kedi bir kasayı kapar (çöpü götürmek cezayı önler)', () => {
    const s = market(7, { energy: 10 });
    s.board = grid(7, ['c']);
    const r = dispatch(s, { type: 'cat', x: 0, y: 0 });
    expect(r.state.board[0]).toBeNull();
    expect(r.state.energy).toBe(0);
    expect(dispatch(s, { type: 'cat', x: 3, y: 3 }).ok).toBe(false);
  });

  it('takas türü değiştirir; çöp takasla değersiz ama cezasız olur; olmayan türe takas yok', () => {
    const s = market(7, { energy: 20, species: ['hamsi', 'lufer'] });
    s.slots[0] = piece('naylon', 'dot', -8);
    const r = dispatch(s, { type: 'swap', src: { from: 'slot', i: 0 }, sp: 'lufer' });
    expect(r.state.slots[0]).toMatchObject({ sp: 'lufer', value: 0 });
    expect(dispatch(s, { type: 'swap', src: { from: 'slot', i: 0 }, sp: 'kalkan' }).ok).toBe(false);
  });

  it('karıştır yuvaları ve bandı karıştırır, balık kaybolmaz', () => {
    const s = market(7, { energy: 20 });
    const before = multiset([...s.slots, ...s.bant]);
    const r = dispatch(s, { type: 'shuffle' });
    expect(r.ok).toBe(true);
    expect(multiset([...r.state.slots, ...r.state.bant])).toEqual(before);
    expect(r.state.energy).toBe(0);
    expect(dispatch(market(7, { energy: 19 }), { type: 'shuffle' }).ok).toBe(false);
  });
});

describe('pazarın kapanışı', () => {
  it('bütün balıklar yerleşince kapanır; tahtada kalanlar yarı fiyata, çöp cezalı', () => {
    const s = market(7, { bant: [], holds: [null] });
    s.board = grid(7, ['h.c'], 10);
    s.slots = [piece('hamsi', 'dot', 10), null, null];
    const r = dispatch(s, { type: 'place', src: { from: 'slot', i: 0 }, x: 5, y: 5 });
    expect(r.state.status).toBe('closed');
    expect(r.state.closeReason).toBe('empty');
    expect(r.state.ledger.clearance).toBe(10);
    expect(r.state.ledger.penalty).toBe(1);
    expect(marketOut(r.state)).toMatchObject({ clearance: 10, penalty: 1, earned: 9 });
  });

  it('sığan parça yoksa: şarj varsa kurtarma, yoksa kapanır ve eldekiler de yarı fiyata satılır', () => {
    const stuck = market(7);
    stuck.board = nearlyFull(7);
    stuck.slots = [piece('lufer', 'i3', 30), null, null];
    stuck.bant = [piece('hamsi', 'dot', 4)].map((p) => ({ ...p, cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] }));
    stuck.holds = [null];

    const rescue = structuredClone(stuck);
    rescue.energy = 10;
    evaluateStatus(rescue, []);
    expect(rescue.status).toBe('rescue');

    const ev: MarketEvent[] = [];
    evaluateStatus(stuck, ev);
    expect(stuck.status).toBe('closed');
    expect(stuck.closeReason).toBe('stuck');
    expect(stuck.ledger.clearance).toBe((46 + 30 + 4) / 2);
  });

  it('pazar erken kapatılabilir; kapandıktan sonra hamle yok; kazanç eksiye düşmez', () => {
    const s = market(7);
    s.slots = [piece('cizme', 'dot', -500), null, null];
    s.bant = [];
    const r = dispatch(s, { type: 'close' });
    expect(r.state.closeReason).toBe('manual');
    expect(marketOut(r.state).earned).toBe(0);
    expect(dispatch(r.state, { type: 'rotate', src: { from: 'slot', i: 0 } }).ok).toBe(false);
  });
});
