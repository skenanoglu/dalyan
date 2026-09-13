import type { SpeciesId } from '../../../app/types';
import { SPECIES } from '../../../app/species';

type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;
const INK = 'rgba(6, 12, 28, 0.62)';

/** Renk körü modunda kasanın köşesine yazılan kısaltma. */
const ABBR: Record<SpeciesId, string> = {
  hamsi: 'Ha',
  istavrit: 'İs',
  cipura: 'Çi',
  palyaco: 'Pa',
  levrek: 'Le',
  altin: 'Al',
  lufer: 'Lü',
  mezgit: 'Me',
  palamut: 'Pl',
  kalkan: 'Ka',
  kilic: 'Kı',
  fener: 'Fe',
  cizme: 'Çz',
  naylon: 'Ny',
};

const cache = new Map<string, HTMLCanvasElement>();

export function roundRect(g: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

/** #rrggbb rengini beyaza (amt > 0) ya da siyaha (amt < 0) doğru karıştırır. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const mix = (c: number): number => Math.round(c + (target - c) * p);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

function drawFish(g: Ctx, cx: number, cy: number, r: number, eye: string): void {
  g.fillStyle = INK;
  g.beginPath();
  g.ellipse(cx - r * 0.12, cy, r * 0.62, r * 0.38, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.moveTo(cx + r * 0.38, cy);
  g.lineTo(cx + r * 0.86, cy - r * 0.36);
  g.lineTo(cx + r * 0.78, cy);
  g.lineTo(cx + r * 0.86, cy + r * 0.36);
  g.closePath();
  g.fill();
  g.fillStyle = eye;
  g.beginPath();
  g.arc(cx - r * 0.44, cy - r * 0.08, Math.max(1, r * 0.09), 0, TAU);
  g.fill();
}

function drawStar(g: Ctx, cx: number, cy: number, r: number): void {
  g.fillStyle = INK;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  g.closePath();
  g.fill();
}

function drawBoot(g: Ctx, cx: number, cy: number, r: number): void {
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(cx - r * 0.35, cy - r * 0.7);
  g.lineTo(cx + r * 0.1, cy - r * 0.7);
  g.lineTo(cx + r * 0.1, cy + r * 0.05);
  g.quadraticCurveTo(cx + r * 0.75, cy + r * 0.1, cx + r * 0.75, cy + r * 0.55);
  g.lineTo(cx - r * 0.35, cy + r * 0.55);
  g.closePath();
  g.fill();
}

function drawBag(g: Ctx, cx: number, cy: number, r: number): void {
  g.fillStyle = INK;
  roundRect(g, cx - r * 0.5, cy - r * 0.3, r, r * 0.9, r * 0.18);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = Math.max(1.2, r * 0.14);
  g.beginPath();
  g.arc(cx - r * 0.22, cy - r * 0.3, r * 0.2, Math.PI, 0);
  g.arc(cx + r * 0.22, cy - r * 0.3, r * 0.2, Math.PI, 0);
  g.stroke();
}

export const spritePad = (cell: number): number => Math.ceil(cell * 0.4);

export interface CrateLook {
  colorblind: boolean;
  cheap: boolean;
}

/** Parlayan buzlu kasa + üstünde türün simgesi. Boyut/tür başına bir kez üretilip saklanır. */
export function crateSprite(sp: SpeciesId, cell: number, look: CrateLook): HTMLCanvasElement {
  const key = `${sp}|${cell}|${look.colorblind ? 1 : 0}|${look.cheap ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const s = SPECIES[sp];
  const pad = spritePad(cell);
  const canvas = document.createElement('canvas');
  canvas.width = cell + pad * 2;
  canvas.height = cell + pad * 2;
  const g = canvas.getContext('2d')!;

  const inset = Math.max(1, cell * 0.05);
  const x = pad + inset;
  const y = pad + inset;
  const side = cell - inset * 2;
  const r = Math.max(3, cell * 0.2);
  const light = shade(s.color, 0.5);
  const dark = shade(s.color, -0.55);

  g.shadowColor = s.color;
  g.shadowBlur = cell * (s.junk ? 0.15 : 0.45);
  g.fillStyle = dark;
  roundRect(g, x, y, side, side, r);
  g.fill();
  if (!s.junk) g.fill();
  g.shadowBlur = 0;

  const grad = g.createLinearGradient(x, y, x, y + side);
  grad.addColorStop(0, light);
  grad.addColorStop(0.5, s.color);
  grad.addColorStop(1, dark);
  g.fillStyle = grad;
  roundRect(g, x, y, side, side, r);
  g.fill();

  // Kasa tahtası çizgileri
  g.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  g.lineWidth = Math.max(1, cell * 0.035);
  g.beginPath();
  g.moveTo(x + side * 0.12, y + side * 0.2);
  g.lineTo(x + side * 0.88, y + side * 0.2);
  g.moveTo(x + side * 0.12, y + side * 0.82);
  g.lineTo(x + side * 0.88, y + side * 0.82);
  g.stroke();

  const cx = pad + cell / 2;
  const cy = pad + cell / 2 + cell * 0.01;
  const ir = cell * 0.3;
  if (sp === 'cizme') drawBoot(g, cx, cy, ir);
  else if (sp === 'naylon') drawBag(g, cx, cy, ir);
  else if (s.joker) drawStar(g, cx, cy, ir);
  else drawFish(g, cx, cy, ir, light);

  if (look.cheap) {
    // Ucuz toptancı kasası: sağ alt köşede beyaz etiket
    g.save();
    roundRect(g, x, y, side, side, r);
    g.clip();
    g.fillStyle = 'rgba(255, 255, 255, 0.8)';
    g.beginPath();
    g.moveTo(x + side, y + side * 0.66);
    g.lineTo(x + side, y + side);
    g.lineTo(x + side * 0.66, y + side);
    g.closePath();
    g.fill();
    g.restore();
  }

  if (look.colorblind) {
    g.font = `800 ${Math.max(7, Math.round(cell * 0.24))}px "Trebuchet MS", system-ui, sans-serif`;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillStyle = 'rgba(255, 255, 255, 0.95)';
    g.fillText(ABBR[sp], x + side * 0.1, y + side * 0.04);
  }

  cache.set(key, canvas);
  return canvas;
}

export function drawCrate(
  g: Ctx,
  sp: SpeciesId,
  px: number,
  py: number,
  cell: number,
  look: CrateLook,
  alpha = 1,
  scale = 1,
): void {
  const size = Math.max(2, Math.round(cell));
  const sprite = crateSprite(sp, size, look);
  const pad = spritePad(size);
  g.save();
  g.globalAlpha = Math.max(0, Math.min(1, alpha));
  if (scale !== 1) {
    const cx = px + cell / 2;
    const cy = py + cell / 2;
    g.translate(cx, cy);
    g.scale(scale, scale);
    g.translate(-cx, -cy);
  }
  g.drawImage(sprite, px - pad, py - pad);
  g.restore();
}

/** Hayalet önizleme karesi. */
export function drawGhost(g: Ctx, sp: SpeciesId, px: number, py: number, cell: number): void {
  const color = SPECIES[sp].color;
  const r = Math.max(3, cell * 0.2);
  g.save();
  roundRect(g, px + cell * 0.07, py + cell * 0.07, cell * 0.86, cell * 0.86, r);
  g.globalAlpha = 0.2;
  g.fillStyle = color;
  g.fill();
  g.globalAlpha = 0.85;
  g.strokeStyle = shade(color, 0.45);
  g.lineWidth = Math.max(1, cell * 0.055);
  g.stroke();
  g.restore();
}
