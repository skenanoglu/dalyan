import type { FishType } from './data';

// Balık, çizme ve poşet çizimleri (BalikAvi/js/cizim.js). Olta ve martı sahneleri ortak kullanır.
// Çizim (0,0) merkezlidir; çağıran konuma taşır ve gerekirse ölçekler.

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

export interface FishPose {
  dir: 1 | -1;
  phase: number;
  caught: boolean;
}

/** Tür başına bir kez üretilen gövde renk geçişleri. */
export type GradientCache = Map<string, CanvasGradient>;

function circle(g: Ctx, x: number, y: number, r: number): void {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function rr(g: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Kovaya girebilen bir türü çizer (tehlikeler hariç). */
export function drawCatchable(g: Ctx, t: FishType, pose: FishPose, ang: number, grads: GradientCache): void {
  if (t.naylon) drawNaylon(g, pose, ang);
  else if (t.junk) drawBoot(g, pose, ang);
  else drawFish(g, t, pose, ang, grads);
}

export function drawFish(g: Ctx, t: FishType, f: FishPose, ang: number, grads: GradientCache): void {
  const L = t.len;
  const h = t.h;
  g.rotate(ang);
  if (f.dir < 0 && !f.caught) g.scale(-1, 1);
  const wag = Math.sin(f.phase * (f.caught ? 22 : 10)) * (f.caught ? 0.45 : 0.28);

  g.fillStyle = t.fin;
  g.save();
  g.translate(-L * 0.42, 0);
  g.rotate(wag);
  g.beginPath();
  g.moveTo(4, 0);
  g.lineTo(-L * 0.28, -h * 0.6);
  g.quadraticCurveTo(-L * 0.18, 0, -L * 0.28, h * 0.6);
  g.closePath();
  g.fill();
  g.restore();

  g.beginPath();
  g.moveTo(-L * 0.2, -h * 0.38);
  g.quadraticCurveTo(-L * 0.02, -h * 0.95, L * 0.16, -h * 0.4);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(-L * 0.1, h * 0.4);
  g.quadraticCurveTo(-L * 0.02, h * 0.8, L * 0.08, h * 0.4);
  g.closePath();
  g.fill();

  let grad = grads.get(t.key);
  if (!grad) {
    grad = g.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, t.body);
    grad.addColorStop(0.55, t.body);
    grad.addColorStop(1, t.belly);
    grads.set(t.key, grad);
  }
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(0, 0, L / 2, h / 2, 0, 0, TAU);
  g.fill();

  g.save();
  g.clip();
  if (t.mark === 'stripes') {
    for (const sx of [L * 0.16, -L * 0.14]) {
      g.fillStyle = '#222';
      g.fillRect(sx - L * 0.08, -h, L * 0.16, h * 2);
      g.fillStyle = '#fff';
      g.fillRect(sx - L * 0.06, -h, L * 0.12, h * 2);
    }
  } else if (t.mark === 'line') {
    g.strokeStyle = 'rgba(30,40,50,.45)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-L / 2, -1);
    g.quadraticCurveTo(0, -h * 0.15, L / 2, -h * 0.05);
    g.stroke();
  } else if (t.mark === 'band') {
    g.strokeStyle = 'rgba(90,100,110,.25)';
    g.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(-L / 2, i * h * 0.12);
      g.lineTo(L / 2, i * h * 0.12);
      g.stroke();
    }
    g.fillStyle = '#e8c14a';
    g.fillRect(L * 0.2, -h * 0.5, 4, h * 0.3);
  } else if (t.mark === 'shine') {
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.beginPath();
    g.ellipse(-L * 0.05, -h * 0.22, L * 0.28, h * 0.12, 0, 0, TAU);
    g.fill();
  } else if (t.mark === 'benek') {
    g.fillStyle = 'rgba(60,48,30,.45)';
    for (const [bx, by, br] of [
      [-0.28, -0.2, 0.1],
      [-0.05, 0.16, 0.13],
      [0.18, -0.14, 0.11],
      [0.3, 0.18, 0.08],
      [-0.36, 0.22, 0.07],
    ]) {
      g.beginPath();
      g.ellipse(L * bx, h * by, L * br * 0.5, h * br, 0, 0, TAU);
      g.fill();
    }
  }
  g.restore();

  if (t.mark === 'kilic') {
    g.fillStyle = t.fin;
    g.beginPath();
    g.moveTo(L * 0.48, -h * 0.06);
    g.lineTo(L * 0.88, -h * 0.02);
    g.lineTo(L * 0.48, h * 0.08);
    g.closePath();
    g.fill();
  } else if (t.mark === 'fener') {
    const ls = Math.sin(f.phase * 2) * 0.12;
    g.strokeStyle = '#2a2439';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(L * 0.1, -h * 0.42);
    g.quadraticCurveTo(L * 0.42, -h * (0.95 + ls), L * 0.52, -h * (0.72 + ls));
    g.stroke();
    const glow = g.createRadialGradient(L * 0.52, -h * (0.72 + ls), 1, L * 0.52, -h * (0.72 + ls), h * 0.3);
    glow.addColorStop(0, 'rgba(255,247,180,1)');
    glow.addColorStop(1, 'rgba(255,230,120,0)');
    g.fillStyle = glow;
    circle(g, L * 0.52, -h * (0.72 + ls), h * 0.3);
    g.fillStyle = '#fff6c8';
    circle(g, L * 0.52, -h * (0.72 + ls), h * 0.09);
    g.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(L * (0.44 - i * 0.08), h * 0.12);
      g.lineTo(L * (0.4 - i * 0.08), h * 0.3);
      g.lineTo(L * (0.36 - i * 0.08), h * 0.12);
      g.closePath();
      g.fill();
    }
  }

  g.strokeStyle = 'rgba(0,0,0,.25)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(L * 0.14, 0, h * 0.32, -1.1, 1.1);
  g.stroke();

  const er = Math.max(2.6, h * 0.14);
  g.fillStyle = '#fff';
  circle(g, L * 0.3, -h * 0.1, er);
  g.fillStyle = '#111';
  circle(g, L * 0.31 + 0.6, -h * 0.1, er * 0.55);

  g.strokeStyle = 'rgba(0,0,0,.35)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(L * 0.5, h * 0.05);
  g.lineTo(L * 0.42, h * 0.12);
  g.stroke();
}

export function drawBoot(g: Ctx, f: FishPose, ang: number): void {
  g.rotate(ang + Math.sin(f.phase * 1.5) * 0.2);
  g.fillStyle = '#6b4423';
  rr(g, -10, -17, 18, 24, 3);
  g.fill();
  g.beginPath();
  g.moveTo(-10, 3);
  g.lineTo(8, 3);
  g.quadraticCurveTo(20, 4, 20, 12);
  g.lineTo(20, 17);
  g.lineTo(-10, 17);
  g.closePath();
  g.fill();
  g.fillStyle = '#3b2410';
  g.fillRect(-10, 14, 30, 4);
  g.fillStyle = '#4e3018';
  g.fillRect(-11, -18, 20, 4);
  g.strokeStyle = '#3c8d40';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, -18);
  g.quadraticCurveTo(6, -26, 2, -32);
  g.stroke();
}

/** Naylon poşet: uzaktan denizanasına benzemesi kasıtlı. */
export function drawNaylon(g: Ctx, f: FishPose, ang: number): void {
  g.rotate(ang + Math.sin(f.phase * 1.2) * 0.15);
  const wave = Math.sin(f.phase * 2) * 3;
  g.fillStyle = 'rgba(226,238,244,.62)';
  g.beginPath();
  g.moveTo(-16, -12);
  g.quadraticCurveTo(-20, 8 + wave, -8, 17);
  g.quadraticCurveTo(2, 22 - wave, 12, 15);
  g.quadraticCurveTo(20, 6 + wave, 15, -12);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.75)';
  g.lineWidth = 2;
  g.stroke();
  g.beginPath();
  g.moveTo(-16, -12);
  g.quadraticCurveTo(-10, -22 + wave, -3, -13);
  g.moveTo(15, -12);
  g.quadraticCurveTo(9, -22 - wave, 2, -13);
  g.stroke();
}
