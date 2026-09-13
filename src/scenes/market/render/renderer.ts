import { SPECIES } from '../../../app/species';
import type { MarketState, Piece } from '../core/types';
import { previewPieces } from '../core/market';
import { EXPORT_MIN, WHOLESALE_MIN, WHOLESALE_MIN_FISH } from '../core/rules';
import { bounds } from '../core/shapes';
import { xyOf } from '../core/board';
import type { DragView, Mode } from '../input';
import { drawCrate, drawGhost, roundRect, shade } from './sprites';
import { fitCell, type Layout, type Rect } from './layout';
import type { Fx } from './fx';

type Ctx = CanvasRenderingContext2D;

const INK = '#eef4ff';
const GOLD = '#ffd23f';
const FONT = '"Trebuchet MS", system-ui, sans-serif';

export interface View {
  state: MarketState;
  drag: DragView | null;
  mode: Mode;
  hover: { x: number; y: number } | null;
}

export class Renderer {
  colorblind = false;
  private pos = new Map<number, { x: number; y: number }>();
  private rot = new Map<number, number>();

  noteRotate(uid: number): void {
    this.rot.set(uid, 0);
  }

  draw(g: Ctx, layout: Layout, view: View, fx: Fx, dt: number, time: number): void {
    g.clearRect(0, 0, layout.w, layout.h);

    g.save();
    this.shake(g, layout, fx);
    this.drawBoardBase(g, layout);
    this.drawCells(g, layout, view.state, fx);
    fx.drawDying(g, layout);
    if (view.drag) this.drawPreview(g, layout, view.drag, time);
    if (view.mode === 'cat') this.drawCatMode(g, layout, view, time);
    g.restore();

    this.drawTray(g, layout, view, dt, time);
    if (view.drag) this.drawDragPiece(g, view.drag);

    g.save();
    this.shake(g, layout, fx);
    fx.drawTop(g, layout);
    g.restore();
  }

  private shake(g: Ctx, layout: Layout, fx: Fx): void {
    if (fx.shake <= 0) return;
    const a = fx.shake * layout.dpr;
    g.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
  }

  private drawBoardBase(g: Ctx, layout: Layout): void {
    const b = layout.board;
    const m = 5 * layout.dpr;
    g.save();
    roundRect(g, b.x - m, b.y - m, b.w + m * 2, b.h + m * 2, 16 * layout.dpr);
    g.fillStyle = 'rgba(20, 10, 40, 0.6)';
    g.fill();
    g.strokeStyle = 'rgba(255, 62, 165, 0.28)';
    g.lineWidth = Math.max(1, layout.dpr * 1.5);
    g.stroke();

    g.strokeStyle = 'rgba(200, 180, 255, 0.07)';
    g.lineWidth = Math.max(1, layout.dpr);
    g.beginPath();
    for (let i = 1; i < layout.size; i++) {
      const o = i * layout.cell;
      g.moveTo(b.x + o, b.y);
      g.lineTo(b.x + o, b.y + b.h);
      g.moveTo(b.x, b.y + o);
      g.lineTo(b.x + b.w, b.y + o);
    }
    g.stroke();
    g.restore();
  }

  private drawCells(g: Ctx, layout: Layout, s: MarketState, fx: Fx): void {
    const { board, cell } = layout;
    for (let i = 0; i < s.board.length; i++) {
      const c = s.board[i];
      if (!c) continue;
      const { x, y } = xyOf(s.size, i);
      drawCrate(g, c.sp, board.x + x * cell, board.y + y * cell, cell, { colorblind: this.colorblind, cheap: c.cheap ?? false }, 1, fx.popScale(x, y));
    }
  }

  private drawPreview(g: Ctx, layout: Layout, drag: DragView, time: number): void {
    const res = drag.res;
    if (!res) return;
    const { board, cell } = layout;
    const color = SPECIES[drag.piece.sp].color;
    const light = shade(color, 0.5);
    const pulse = 0.5 + 0.5 * Math.sin(time * 8);

    g.save();
    g.globalAlpha = 0.14 + pulse * 0.12;
    g.fillStyle = light;
    for (const r of res.rows) g.fillRect(board.x, board.y + r * cell, board.w, cell);
    for (const c of res.cols) g.fillRect(board.x + c * cell, board.y, cell, board.h);
    g.restore();

    const pv = res.preview;
    if (pv && pv.cells.length >= 3) {
      const n = pv.cells.length;
      const ready = n >= WHOLESALE_MIN && pv.fish >= WHOLESALE_MIN_FISH;
      g.save();
      g.strokeStyle = light;
      g.lineWidth = Math.max(1.5, cell * 0.06);
      g.globalAlpha = ready ? 0.55 + pulse * 0.45 : 0.4;
      let sx = 0;
      let sy = 0;
      for (const i of pv.cells) {
        const { x, y } = xyOf(layout.size, i);
        sx += x;
        sy += y;
        roundRect(g, board.x + x * cell + cell * 0.1, board.y + y * cell + cell * 0.1, cell * 0.8, cell * 0.8, cell * 0.2);
        g.stroke();
      }
      g.restore();
      const label = ready
        ? n >= EXPORT_MIN
          ? 'İHRACAT!'
          : 'TOPTAN!'
        : n >= WHOLESALE_MIN
          ? '+1 balık lazım'
          : `${n}/${WHOLESALE_MIN}`;
      this.drawBadge(g, layout, label, board.x + (sx / n + 0.5) * cell, board.y + (sy / n) * cell - cell * 0.5, ready ? GOLD : INK, ready ? pulse : 0);
    }

    for (const c of drag.piece.cells) {
      drawGhost(g, drag.piece.sp, board.x + (drag.gx + c.x) * cell, board.y + (drag.gy + c.y) * cell, cell);
    }
  }

  private drawBadge(g: Ctx, layout: Layout, text: string, cx: number, cy: number, color: string, glow: number): void {
    const { board, unit } = layout;
    const size = Math.round(unit * 0.36);
    g.save();
    g.font = `800 ${size}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const w = g.measureText(text).width + unit * 0.5;
    const h = size + unit * 0.28;
    const x = Math.min(Math.max(cx - w / 2, board.x), board.x + board.w - w);
    const y = Math.max(cy - h / 2, board.y + h * 0.1);
    roundRect(g, x, y, w, h, h / 2);
    g.fillStyle = 'rgba(10, 6, 24, 0.9)';
    g.fill();
    g.strokeStyle = color;
    g.lineWidth = Math.max(1, layout.dpr);
    g.globalAlpha = 0.6 + glow * 0.4;
    g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = unit * 0.35 * glow;
    g.fillText(text, x + w / 2, y + h / 2 + size * 0.05);
    g.restore();
  }

  private drawCatMode(g: Ctx, layout: Layout, view: View, time: number): void {
    const { board, cell } = layout;
    g.save();
    g.fillStyle = 'rgba(6, 4, 18, 0.45)';
    g.fillRect(board.x, board.y, board.w, board.h);
    const h = view.hover;
    if (h && view.state.board[h.y * layout.size + h.x]) {
      g.strokeStyle = GOLD;
      g.lineWidth = Math.max(2, cell * 0.08);
      g.globalAlpha = 0.6 + 0.4 * Math.sin(time * 9);
      roundRect(g, board.x + h.x * cell, board.y + h.y * cell, cell, cell, cell * 0.2);
      g.stroke();
    }
    g.restore();
  }

  private drawTray(g: Ctx, layout: Layout, view: View, dt: number, time: number): void {
    const { state, drag } = view;
    const seen = new Set<number>();
    const dragUid = drag ? drag.piece.uid : -1;
    const u = layout.unit;

    layout.holds.forEach((box, i) => {
      const p = state.holds[i];
      this.drawBox(g, layout, box, p ? '' : 'DOLAP', drag?.overHold === i);
      if (p && p.uid !== dragUid) {
        seen.add(p.uid);
        this.drawPieceInBox(g, box, p, u * 0.5, dt, view, time);
      }
    });

    layout.slots.forEach((box, i) => {
      this.drawBox(g, layout, box, '', drag?.overSlot === i);
      const p = state.slots[i];
      if (p && p.uid !== dragUid) {
        seen.add(p.uid);
        this.drawPieceInBox(g, box, p, u * 0.62, dt, view, time);
      }
    });

    const next = previewPieces(state);
    layout.preview.forEach((box, i) => {
      this.drawBox(g, layout, box, i < next.length ? '' : '—', false);
      const p = next[i];
      if (!p) return;
      seen.add(p.uid);
      this.drawPieceInBox(g, box, p, u * 0.34, dt, view, time, 0.75);
    });

    for (const uid of [...this.pos.keys()]) if (!seen.has(uid) && uid !== dragUid) this.pos.delete(uid);

    g.save();
    g.fillStyle = 'rgba(190, 170, 230, 0.8)';
    g.font = `700 ${Math.round(9 * layout.dpr)}px ${FONT}`;
    g.textAlign = 'center';
    g.fillText(`SIRADAKİ · ${state.bant.length}`, layout.preview[0].x + layout.preview[0].w / 2, layout.tray.y - 6 * layout.dpr);
    g.restore();
  }

  private drawBox(g: Ctx, layout: Layout, r: Rect, label: string, highlight: boolean): void {
    g.save();
    roundRect(g, r.x, r.y, r.w, r.h, 12 * layout.dpr);
    g.fillStyle = highlight ? 'rgba(255, 62, 165, 0.16)' : 'rgba(255, 255, 255, 0.04)';
    g.fill();
    g.strokeStyle = highlight ? 'rgba(255, 62, 165, 0.85)' : 'rgba(200, 180, 255, 0.14)';
    g.lineWidth = Math.max(1, layout.dpr);
    g.stroke();
    if (label) {
      g.fillStyle = 'rgba(190, 170, 230, 0.75)';
      g.font = `700 ${Math.round(9 * layout.dpr)}px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
    }
    g.restore();
  }

  private drawPieceInBox(g: Ctx, box: Rect, piece: Piece, max: number, dt: number, view: View, time: number, alpha = 1): void {
    const { w, h } = bounds(piece.cells);
    const cell = fitCell(box, w, h, max);
    const tx = box.x + (box.w - w * cell) / 2;
    const ty = box.y + (box.h - h * cell) / 2;
    const cur = this.pos.get(piece.uid);
    const k = 1 - Math.exp(-dt * 16);
    const p = cur ? { x: cur.x + (tx - cur.x) * k, y: cur.y + (ty - cur.y) * k } : { x: tx, y: ty };
    this.pos.set(piece.uid, p);

    // Takas modunda seçilebilir parçalar nabız atar.
    const a = view.mode === 'swap' ? 0.55 + 0.45 * Math.sin(time * 7) : alpha;

    g.save();
    const rt = this.rot.get(piece.uid);
    if (rt !== undefined) {
      const prog = Math.min(1, rt / 0.16);
      const cx = p.x + (w * cell) / 2;
      const cy = p.y + (h * cell) / 2;
      g.translate(cx, cy);
      g.rotate(((prog - 1) * Math.PI) / 2);
      g.translate(-cx, -cy);
      if (prog >= 1) this.rot.delete(piece.uid);
      else this.rot.set(piece.uid, rt + dt);
    }
    const look = { colorblind: this.colorblind, cheap: piece.cheap };
    for (const c of piece.cells) drawCrate(g, piece.sp, p.x + c.x * cell, p.y + c.y * cell, cell, look, a);
    g.restore();
  }

  private drawDragPiece(g: Ctx, drag: DragView): void {
    const look = { colorblind: this.colorblind, cheap: drag.piece.cheap };
    for (const c of drag.piece.cells) {
      drawCrate(g, drag.piece.sp, drag.px + c.x * drag.cell, drag.py + c.y * drag.cell, drag.cell, look, 0.95);
    }
  }
}
