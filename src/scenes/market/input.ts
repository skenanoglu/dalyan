import type { MarketState, Piece, Source } from './core/types';
import { getPiece } from './core/market';
import { resolvePlacement, type Resolution } from './core/resolve';
import { bounds } from './core/shapes';
import { boardCell, inRect, type Layout } from './render/layout';

export type Mode = 'play' | 'cat' | 'swap';

export interface DragView {
  src: Source;
  piece: Piece;
  /** Parçanın sol üst köşesi (aygıt pikseli). */
  px: number;
  py: number;
  cell: number;
  gx: number;
  gy: number;
  valid: boolean;
  res: Resolution | null;
  /** Yuvadan dolaba bırakılıyorsa dolap indeksi. */
  overHold: number | null;
  /** Dolaptan yuvaya bırakılıyorsa yuva indeksi. */
  overSlot: number | null;
}

export interface PointerHooks {
  state(): MarketState;
  layout(): Layout;
  mode(): Mode;
  enabled(): boolean;
  onRotate(src: Source): void;
  onPlace(src: Source, x: number, y: number): void;
  onHold(slot: number, hold: number): void;
  onBoardTap(x: number, y: number): void;
  onPickPiece(src: Source): void;
  onDrag(drag: DragView | null): void;
  onHover(cell: { x: number; y: number } | null): void;
}

/** Bu kadar CSS pikselinden az hareket = dokunma (döndür), fazlası = sürükleme. */
const TAP_DIST = 8;

interface Active {
  id: number;
  src: Source;
  sx: number;
  sy: number;
  moved: boolean;
  touch: boolean;
}

/** Tuvale işaretçi olaylarını bağlar; sökme fonksiyonu döner. */
export function attachPointer(canvas: HTMLCanvasElement, hooks: PointerHooks): () => void {
  let active: Active | null = null;

  const toDevice = (e: PointerEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    const l = hooks.layout();
    return { x: (e.clientX - r.left) * (l.w / r.width), y: (e.clientY - r.top) * (l.h / r.height) };
  };

  const sourceAt = (x: number, y: number): Source | null => {
    const l = hooks.layout();
    const s = hooks.state();
    for (let i = 0; i < l.holds.length; i++) if (s.holds[i] && inRect(l.holds[i], x, y)) return { from: 'hold', i };
    for (let i = 0; i < l.slots.length; i++) if (s.slots[i] && inRect(l.slots[i], x, y)) return { from: 'slot', i };
    return null;
  };

  const makeDrag = (a: Active, x: number, y: number): DragView | null => {
    const l = hooks.layout();
    const s = hooks.state();
    const piece = getPiece(s, a.src);
    if (!piece) return null;
    const { w, h } = bounds(piece.cells);
    const cell = l.cell;
    const px = x - (w * cell) / 2;
    // Dokunmatikte parça parmağın üstünde durur ki parmak parçayı kapatmasın.
    const py = a.touch ? y - h * cell - cell * 0.55 : y - (h * cell) / 2;
    const gx = Math.round((px - l.board.x) / cell);
    const gy = Math.round((py - l.board.y) / cell);
    const res = resolvePlacement(s.board, s.size, piece, gx, gy);
    const overHold = a.src.from === 'slot' ? l.holds.findIndex((r) => inRect(r, x, y)) : -1;
    const overSlot = a.src.from === 'hold' ? l.slots.findIndex((r) => inRect(r, x, y)) : -1;
    return {
      src: a.src,
      piece,
      px,
      py,
      cell,
      gx,
      gy,
      valid: res !== null,
      res,
      overHold: overHold >= 0 ? overHold : null,
      overSlot: overSlot >= 0 ? overSlot : null,
    };
  };

  const down = (e: PointerEvent): void => {
    if (!hooks.enabled()) return;
    const { x, y } = toDevice(e);
    const mode = hooks.mode();
    if (mode === 'cat') {
      const c = boardCell(hooks.layout(), x, y);
      if (c) hooks.onBoardTap(c.x, c.y);
      return;
    }
    const src = sourceAt(x, y);
    if (mode === 'swap') {
      if (src) hooks.onPickPiece(src);
      return;
    }
    if (!src) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* sentetik olaylarda yakalama olmayabilir */
    }
    active = { id: e.pointerId, src, sx: x, sy: y, moved: false, touch: e.pointerType !== 'mouse' };
  };

  const move = (e: PointerEvent): void => {
    const l = hooks.layout();
    if (!active || e.pointerId !== active.id) {
      if (hooks.mode() === 'cat' && e.pointerType === 'mouse') {
        const { x, y } = toDevice(e);
        hooks.onHover(boardCell(l, x, y));
      }
      return;
    }
    const { x, y } = toDevice(e);
    if (!active.moved && Math.hypot(x - active.sx, y - active.sy) > TAP_DIST * l.dpr) active.moved = true;
    if (active.moved) hooks.onDrag(makeDrag(active, x, y));
  };

  const finish = (e: PointerEvent, cancelled: boolean): void => {
    const a = active;
    if (!a || e.pointerId !== a.id) return;
    active = null;
    hooks.onDrag(null);
    if (cancelled) return;
    if (!a.moved) {
      hooks.onRotate(a.src);
      return;
    }
    const { x, y } = toDevice(e);
    const d = makeDrag(a, x, y);
    if (!d) return;
    if (d.overHold !== null && a.src.from === 'slot') hooks.onHold(a.src.i, d.overHold);
    else if (d.overSlot !== null && a.src.from === 'hold') hooks.onHold(d.overSlot, a.src.i);
    else if (d.valid) hooks.onPlace(a.src, d.gx, d.gy);
  };

  const up = (e: PointerEvent): void => finish(e, false);
  const cancel = (e: PointerEvent): void => finish(e, true);
  const menu = (e: Event): void => e.preventDefault();

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('contextmenu', menu);
  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', cancel);
    canvas.removeEventListener('contextmenu', menu);
  };
}
