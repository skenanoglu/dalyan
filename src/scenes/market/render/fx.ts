import type { SpeciesId } from '../../../app/types';
import { SPECIES } from '../../../app/species';
import type { CellRef, Coord } from '../core/types';
import type { Layout } from './layout';
import { drawCrate, shade } from './sprites';

type Ctx = CanvasRenderingContext2D;
type DyingKind = 'line' | 'burst' | 'ring';

interface Dying {
  x: number;
  y: number;
  sp: SpeciesId;
  cheap: boolean;
  t: number;
  delay: number;
  dur: number;
  kind: DyingKind;
  cx: number;
  cy: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  size: number;
  color: string;
}

interface FloatText {
  text: string;
  x: number;
  y: number;
  t: number;
  life: number;
  color: string;
  size: number;
}

interface Pop {
  x: number;
  y: number;
  t: number;
  life: number;
}

const GOLD = '#ffd23f';
/** Konum ve hızlar hücre biriminde; ekran boyutundan bağımsız. */
const GRAVITY = 16;

export class Fx {
  colorblind = false;
  shake = 0;
  private dying: Dying[] = [];
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private pops: Pop[] = [];

  popCells(cells: CellRef[]): void {
    for (const c of cells) this.pops.push({ x: c.x, y: c.y, t: 0, life: 0.22 });
  }

  popScale(x: number, y: number): number {
    for (const p of this.pops) {
      if (p.x === x && p.y === y) return 1 + 0.2 * Math.sin(Math.PI * (p.t / p.life));
    }
    return 1;
  }

  private add(c: CellRef, kind: DyingKind, delay: number, dur: number, cx: number, cy: number): void {
    this.dying.push({ x: c.x, y: c.y, sp: c.crate.sp, cheap: c.crate.cheap ?? false, t: 0, delay, dur, kind, cx, cy });
  }

  lineClear(cells: CellRef[], from: Coord): void {
    for (const c of cells) this.add(c, 'line', Math.hypot(c.x - from.x, c.y - from.y) * 0.022, 0.24, from.x, from.y);
    this.shake = Math.max(this.shake, 3);
  }

  burst(cells: CellRef[], big: boolean): void {
    const at = centroidOf(cells);
    for (const c of cells) this.add(c, 'burst', 0.18 + Math.hypot(c.x - at.x, c.y - at.y) * 0.025, 0.3, at.x, at.y);
    this.shake = Math.max(this.shake, big ? 15 : 8);
  }

  ring(cells: CellRef[]): void {
    for (const c of cells) this.add(c, 'burst', 0.34, 0.26, c.x, c.y);
  }

  single(cell: CellRef): void {
    this.add(cell, 'burst', 0, 0.26, cell.x, cell.y);
  }

  text(text: string, at: Coord, color: string, size = 1): void {
    this.texts.push({ text, x: at.x, y: at.y, t: 0, life: 1.15, color, size });
  }

  private spawn(d: Dying): void {
    const count = d.kind === 'line' ? 4 : 9;
    const light = shade(SPECIES[d.sp].color, 0.5);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = d.kind === 'burst' ? 2 + Math.random() * 6 : 1.5 + Math.random() * 3.5;
      let vx = Math.cos(a) * sp;
      let vy = Math.sin(a) * sp;
      if (d.kind === 'burst') {
        const dx = d.x - d.cx;
        const dy = d.y - d.cy;
        const len = Math.hypot(dx, dy) || 1;
        vx += (dx / len) * 5;
        vy += (dy / len) * 5;
      }
      this.particles.push({
        x: d.x + 0.5,
        y: d.y + 0.5,
        vx,
        vy,
        t: 0,
        life: 0.45 + Math.random() * 0.45,
        size: 0.09 + Math.random() * 0.15,
        // Satışta ara sıra altın para parıltısı
        color: !SPECIES[d.sp].junk && Math.random() < 0.25 ? GOLD : light,
      });
    }
  }

  update(dt: number): void {
    this.shake *= Math.exp(-dt * 8);
    if (this.shake < 0.3) this.shake = 0;
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const d = this.dying[i];
      d.t += dt;
      if (d.t >= d.delay + d.dur) {
        this.spawn(d);
        this.dying.splice(i, 1);
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.t += dt;
      if (p.t >= p.life) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += GRAVITY * dt;
      p.vx *= 0.985;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      this.texts[i].t += dt;
      if (this.texts[i].t >= this.texts[i].life) this.texts.splice(i, 1);
    }
    for (let i = this.pops.length - 1; i >= 0; i--) {
      this.pops[i].t += dt;
      if (this.pops[i].t >= this.pops[i].life) this.pops.splice(i, 1);
    }
  }

  drawDying(g: Ctx, layout: Layout): void {
    const { cell, board } = layout;
    for (const d of this.dying) {
      const look = { colorblind: this.colorblind, cheap: d.cheap };
      const px = board.x + d.x * cell;
      const py = board.y + d.y * cell;
      const p = (d.t - d.delay) / d.dur;
      if (p < 0) {
        if (d.kind === 'burst') {
          const jitter = cell * 0.05 * Math.sin(d.t * 70);
          drawCrate(g, d.sp, px + jitter, py, cell, look, 1, 1 + 0.05 * Math.sin(d.t * 50));
        } else {
          drawCrate(g, d.sp, px, py, cell, look);
        }
        continue;
      }
      const e = Math.min(1, p);
      const scale = d.kind === 'line' ? Math.max(0.02, 1 - e) : 1 + e * 0.55;
      drawCrate(g, d.sp, px, py, cell, look, 1 - e, scale);
    }
  }

  drawTop(g: Ctx, layout: Layout): void {
    const { cell, board } = layout;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const fade = 1 - p.t / p.life;
      const r = p.size * cell * fade;
      if (r <= 0.2) continue;
      g.globalAlpha = Math.min(1, fade * 1.2);
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(board.x + p.x * cell, board.y + p.y * cell, r, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    g.save();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = t.t / t.life;
      const size = Math.round(Math.min(cell, layout.unit * 1.25) * 0.42 * t.size);
      g.font = `800 ${size}px "Trebuchet MS", system-ui, sans-serif`;
      g.globalAlpha = k < 0.15 ? k / 0.15 : Math.max(0, 1 - (k - 0.15) / 0.85);
      g.fillStyle = t.color;
      g.shadowColor = t.color;
      g.shadowBlur = size * 0.8;
      const half = g.measureText(t.text).width / 2;
      const x = Math.min(Math.max(board.x + t.x * cell, board.x + half), board.x + board.w - half);
      g.fillText(t.text, x, board.y + t.y * cell - k * cell * 1.2);
    }
    g.restore();
  }
}

export function centroidOf(cells: Coord[]): Coord {
  let x = 0;
  let y = 0;
  for (const c of cells) {
    x += c.x + 0.5;
    y += c.y + 0.5;
  }
  return { x: x / Math.max(1, cells.length), y: y / Math.max(1, cells.length) };
}
