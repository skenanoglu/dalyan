import { describe, expect, it } from 'vitest';
import { findGroups, isWholesale } from '../../src/scenes/market/core/cluster';
import { resolvePlacement } from '../../src/scenes/market/core/resolve';
import { MAX_PIECE_CELLS, SHAPES, rotateCW, sameCells } from '../../src/scenes/market/core/shapes';
import { SPECIES, SPECIES_ORDER } from '../../src/app/species';
import { WHOLESALE_MIN } from '../../src/scenes/market/core/rules';
import { grid, piece } from './helpers';

const wholesale = (size: number, rows: string[]) => findGroups(grid(size, rows), size).filter(isWholesale);

describe('türler ve şekiller', () => {
  it('her türün şekli tanımlı ve 4 dönüş kimliğe döner', () => {
    for (const sp of SPECIES_ORDER) {
      for (const id of SPECIES[sp].shapes) expect(SHAPES.some((s) => s.id === id), `${sp}:${id}`).toBe(true);
    }
    for (const s of SHAPES) {
      let c = s.cells;
      for (let i = 0; i < 4; i++) c = rotateCW(c);
      expect(sameCells(c, s.cells)).toBe(true);
    }
  });

  it('büyük balık büyük parça: kılıç 5, kalkan 9 kasa; tek balık toptan eşiğini aşsa bile tek başına satılmaz', () => {
    expect(SHAPES.find((s) => s.id === 'i5')!.cells).toHaveLength(5);
    expect(MAX_PIECE_CELLS).toBe(9);
    expect(MAX_PIECE_CELLS).toBeGreaterThan(WHOLESALE_MIN);
    expect(wholesale(7, ['KKK', 'KKK', 'KKK'])).toHaveLength(0);
  });
});

describe('toptan satış kümesi', () => {
  it('7 kasa satılmaz, 8 kasa (ayrı balıklar) satılır', () => {
    expect(wholesale(7, ['hhhhhhh'])).toHaveLength(0);
    expect(wholesale(7, ['hhhhhhh', 'h......'])).toHaveLength(1);
  });

  it('8 kasa ama tek balıktan geliyorsa satılmaz, ikinci balıkla satılır', () => {
    expect(wholesale(7, ['HHHH', 'HHHH'])).toHaveLength(0);
    expect(wholesale(7, ['HHHH', 'HHHh'])).toHaveLength(1);
  });

  it('çapraz temas ve farklı tür kümeye girmez', () => {
    expect(wholesale(9, ['hhhh.....', '....hhhh.'])).toHaveLength(0);
    expect(wholesale(9, ['hhhhlhhh.'])).toHaveLength(0);
  });

  it('çöp araya girerse küme bölünür', () => {
    expect(wholesale(9, ['hhhhchhhh'])).toHaveLength(0);
  });

  it('altın balık joker: eksik kasayı tamamlar ve iki türün kümesine birden girebilir', () => {
    expect(wholesale(7, ['hhhhhhh', 'a......'])).toHaveLength(1);
    const g = wholesale(9, ['hhhhahhhh', '....l....', 'llllllll.']);
    expect(g.map((x) => x.sp).sort()).toEqual(['hamsi', 'lufer']);
  });

  it('joker kendi başına küme başlatamaz', () => {
    expect(wholesale(9, ['aaaaaaaaa'])).toHaveLength(0);
  });
});

describe('yerleştirme ve satış', () => {
  it('dolu sıra perakende satılır (kasa değeri ×1)', () => {
    const board = grid(7, ['hlhlhl.'], 10);
    const r = resolvePlacement(board, 7, piece('istavrit', 'dot', 10), 6, 0)!;
    expect(r.rows).toEqual([0]);
    expect(r.sales).toEqual({ retail: 70, wholesale: 0, export: 0 });
    expect(r.after.every((c) => c === null)).toBe(true);
    expect(r.boardClear).toBe(true);
  });

  it('toptan satış ×2; hem sırada hem kümede olan kasa bir kez (toptan) satılır', () => {
    const board = grid(7, ['hhhhhh.', 'h......'], 10);
    const r = resolvePlacement(board, 7, piece('hamsi', 'dot', 10), 6, 0)!;
    expect(r.rows).toEqual([0]);
    expect(r.groups).toHaveLength(1);
    expect(r.lineCells).toHaveLength(0);
    expect(r.sales).toEqual({ retail: 0, wholesale: 160, export: 0 });
  });

  it('ihracat (14+) ×3 ve çevresindeki kasalar perakende satılır; halkadaki çöp cezasız kalkar', () => {
    const board = grid(9, ['hhhhhhh..', 'hhhhhh...', 'lc.......'], 10);
    const r = resolvePlacement(board, 9, piece('hamsi', 'dot', 10), 6, 1)!;
    expect(r.groups[0].export).toBe(true);
    expect(r.groups[0].cells).toHaveLength(14);
    expect(r.ring.map((c) => c.crate.sp).sort()).toEqual(['cizme', 'lufer']);
    expect(r.sales).toEqual({ retail: 10, wholesale: 0, export: 420 });
    expect(r.after.every((c) => c === null)).toBe(true);
  });

  it('parça değeri kasalarına bölünür', () => {
    const r = resolvePlacement(grid(7, []), 7, piece('kalkan', 'o3', 90), 0, 0)!;
    expect(r.placed.every((c) => c.crate.v === 10)).toBe(true);
    expect(r.placed.every((c) => c.crate.fish === r.placed[0].crate.fish)).toBe(true);
  });

  it('önizleme: parçanın gireceği küme ve balık sayısı', () => {
    const r = resolvePlacement(grid(7, ['hhh....']), 7, piece('hamsi', 'i2', 2), 3, 0)!;
    expect(r.preview).toMatchObject({ sp: 'hamsi', fish: 4 });
    expect(r.preview!.cells).toHaveLength(5);
    expect(resolvePlacement(grid(7, []), 7, piece('cizme'), 0, 0)!.preview).toBeNull();
  });

  it('dolu hücreye ya da tahta dışına yerleşmez', () => {
    expect(resolvePlacement(grid(7, ['h']), 7, piece('hamsi'), 0, 0)).toBeNull();
    expect(resolvePlacement(grid(7, []), 7, piece('kilic', 'i5'), 3, 0)).toBeNull();
  });
});
