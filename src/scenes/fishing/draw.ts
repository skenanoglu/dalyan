import { SURFACE, TAU, W, clamp, lerp, type Fish, type FishingWorld, type HookPoint } from './world';
import { drawCatchable } from './fishart';
import { NIGHT } from '../../app/weather';

// Balık Avı'nın çizim kodu (BalikAvi/js/cizim.js) bağlamı parametre alacak şekilde taşındı.

type Ctx = CanvasRenderingContext2D;

const SKY_H = SURFACE + 7;
const SEABED_ABOVE = 120;
const SEABED_BELOW = 60;

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

function text(g: Ctx, str: string, x: number, y: number, size: number, color = '#fff'): void {
  g.font = `bold ${size}px "Segoe UI", system-ui, Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(0,0,0,.35)';
  g.fillText(str, x + 2, y + 2);
  g.fillStyle = color;
  g.fillText(str, x, y);
}

function drawStar(g: Ctx, cx: number, cy: number, R: number, r: number, n: number, color: string): void {
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const rad = i % 2 ? r : R;
    g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  g.closePath();
  g.fill();
}

interface Strip {
  c: HTMLCanvasElement;
  y: number;
  h: number;
}

export interface DrawOptions {
  /** Dünya birimi → aygıt pikseli. */
  scale: number;
  lowQuality: boolean;
  /** Üst bilgi şeridinin altı (dünya birimi); yüzey şeridi buraya çizilir. */
  topInset: number;
}

export class FishingRenderer {
  private sky: Strip | null = null;
  private seabed: Strip | null = null;
  private builtScale = 0;
  private waterGrad: CanvasGradient | null = null;
  private rayGrad: CanvasGradient | null = null;
  private surfaceGrad: CanvasGradient | null = null;
  private fishGrads = new Map<string, CanvasGradient>();
  private darkCanvas: HTMLCanvasElement | null = null;

  draw(g: Ctx, w: FishingWorld, o: DrawOptions): void {
    if (this.builtScale !== o.scale) this.build(w, o.scale);

    g.setTransform(o.scale, 0, 0, o.scale, 0, -Math.round(w.camY) * o.scale);
    this.background(g, w);
    this.skyAnim(g, w);
    this.stormSky(g, w);
    this.waterAnim(g, w, o.lowQuality);
    this.seabedAnim(g, w);
    for (const f of w.fishes) if (!f.caught) this.entity(g, f, f.x, f.y);
    this.bubbles(g, w);
    this.murk(g, w);
    this.boat(g, w);
    if (w.night) this.lantern(g, w);
    this.lineAndHook(g, w);
    this.flights(g, w);
    this.surfaceOverlay(g, w);
    this.effects(g, w);
    this.rain(g, w);

    g.setTransform(o.scale, 0, 0, o.scale, 0, 0);
    if (w.night) this.nightDark(g, w, o.scale);
    if (w.flash > 0) {
      g.fillStyle = `rgba(235,240,255,${w.flash * 0.55})`;
      g.fillRect(0, 0, W, w.H);
    }
    if (w.camY > 4) this.surfaceStrip(g, w, o.topInset);
  }

  // ---------- Arka plan önbelleği ----------
  private strip(w: FishingWorld, scale: number, worldY: number, height: number, paint: (g: Ctx) => void): Strip {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * scale));
    c.height = Math.max(1, Math.round(height * scale));
    const g = c.getContext('2d')!;
    g.setTransform(scale, 0, 0, scale, 0, -worldY * scale);
    paint(g);
    void w;
    return { c, y: worldY, h: height };
  }

  private build(w: FishingWorld, scale: number): void {
    this.sky = this.strip(w, scale, 0, SKY_H, (g) => this.skyStatic(g));
    this.seabed = this.strip(w, scale, w.tabanY - SEABED_ABOVE, SEABED_ABOVE + SEABED_BELOW, (g) => this.seabedStatic(g, w));
    this.waterGrad = null;
    this.rayGrad = null;
    this.surfaceGrad = null;
    this.fishGrads.clear();
    this.builtScale = scale;
  }

  private background(g: Ctx, w: FishingWorld): void {
    if (!this.waterGrad) {
      this.waterGrad = g.createLinearGradient(0, SURFACE, 0, w.tabanY + 40);
      this.waterGrad.addColorStop(0, '#3db3e3');
      this.waterGrad.addColorStop(0.4, '#1a7db5');
      this.waterGrad.addColorStop(1, '#073556');
    }
    g.fillStyle = this.waterGrad;
    g.fillRect(0, SURFACE + 6, W, Math.max(w.worldH, w.tabanY + SEABED_BELOW) - SURFACE - 6);
    if (this.sky) g.drawImage(this.sky.c, 0, this.sky.y, W, this.sky.h);
    if (this.seabed) g.drawImage(this.seabed.c, 0, this.seabed.y, W, this.seabed.h);
    // Tabanın altı ekranda görünürse kumla doldur
    const below = w.tabanY + SEABED_BELOW;
    if (w.camY + w.H > below) {
      g.fillStyle = '#a88d55';
      g.fillRect(0, below - 1, W, w.camY + w.H - below + 2);
    }
  }

  private skyStatic(g: Ctx): void {
    const grad = g.createLinearGradient(0, 0, 0, SURFACE);
    grad.addColorStop(0, '#5fb4ec');
    grad.addColorStop(1, '#cdeeff');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, SKY_H);

    const sx = W - 110;
    const sy = 70;
    const sun = g.createRadialGradient(sx, sy, 10, sx, sy, 80);
    sun.addColorStop(0, 'rgba(255,250,210,1)');
    sun.addColorStop(0.35, 'rgba(255,236,150,.9)');
    sun.addColorStop(1, 'rgba(255,236,150,0)');
    g.fillStyle = sun;
    circle(g, sx, sy, 80);
    g.fillStyle = '#fff6c8';
    circle(g, sx, sy, 28);

    g.fillStyle = '#6fa98a';
    g.beginPath();
    g.ellipse(120, SURFACE + 4, 150, 34, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = '#86bb9d';
    g.beginPath();
    g.ellipse(280, SURFACE + 4, 100, 22, 0, Math.PI, 0);
    g.fill();

    const lx = 120;
    const ly = SURFACE - 30;
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i % 2 ? '#fff' : '#d9443a';
      const y0 = ly - i * 13;
      const w0 = 16 - i * 1.2;
      const w1 = 16 - (i + 1) * 1.2;
      g.beginPath();
      g.moveTo(lx - w0 / 2, y0);
      g.lineTo(lx + w0 / 2, y0);
      g.lineTo(lx + w1 / 2, y0 - 13);
      g.lineTo(lx - w1 / 2, y0 - 13);
      g.closePath();
      g.fill();
    }
    g.fillStyle = '#34495e';
    g.beginPath();
    g.moveTo(lx - 8, ly - 62);
    g.lineTo(lx + 8, ly - 62);
    g.lineTo(lx, ly - 72);
    g.closePath();
    g.fill();
  }

  private skyAnim(g: Ctx, w: FishingWorld): void {
    const ly = SURFACE - 30;
    g.fillStyle = `rgba(255,230,120,${0.7 + Math.sin(w.T * 3) * 0.3})`;
    g.fillRect(115, ly - 62, 10, 9);

    g.fillStyle = 'rgba(255,255,255,.92)';
    for (const c of w.clouds) {
      g.save();
      g.translate(c.x, c.y);
      g.scale(c.s, c.s);
      circle(g, 0, 0, 22);
      circle(g, 24, -10, 28);
      circle(g, 52, 0, 22);
      circle(g, 26, 8, 22);
      g.restore();
    }

    g.strokeStyle = '#34495e';
    g.lineWidth = 2;
    for (const b of w.birds) {
      const flap = Math.sin(w.T * 8 + b.p) * 4;
      g.beginPath();
      g.moveTo(b.x - 9, b.y);
      g.quadraticCurveTo(b.x - 4, b.y - 6 + flap, b.x, b.y);
      g.quadraticCurveTo(b.x + 4, b.y - 6 + flap, b.x + 9, b.y);
      g.stroke();
    }
  }

  private waterAnim(g: Ctx, w: FishingWorld, low: boolean): void {
    g.fillStyle = '#3db3e3';
    g.beginPath();
    g.moveTo(0, SURFACE + 8);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, w.waveY(x));
    g.lineTo(W, SURFACE + 8);
    g.closePath();
    g.fill();

    // Işık huzmeleri zayıf cihazlarda pahalı; derine inince zaten görünmez.
    if (low) return;
    const rayBottom = Math.min(w.tabanY, SURFACE + 620);
    if (w.camY > rayBottom) return;
    if (!this.rayGrad) {
      this.rayGrad = g.createLinearGradient(0, SURFACE, 0, rayBottom);
      this.rayGrad.addColorStop(0, 'rgba(255,255,255,0.10)');
      this.rayGrad.addColorStop(1, 'rgba(255,255,255,0)');
    }
    g.fillStyle = this.rayGrad;
    for (let i = 0, n = Math.ceil(W / 180); i < n; i++) {
      const x = 70 + i * 180 + Math.sin(w.T * 0.35 + i * 1.7) * 30;
      g.beginPath();
      g.moveTo(x - 18, SURFACE);
      g.lineTo(x + 22, SURFACE);
      g.lineTo(x + 80, rayBottom);
      g.lineTo(x - 50, rayBottom);
      g.closePath();
      g.fill();
    }
  }

  private seabedStatic(g: Ctx, w: FishingWorld): void {
    const bottom = w.tabanY + SEABED_BELOW;
    const grad = g.createLinearGradient(0, w.tabanY - 10, 0, bottom);
    grad.addColorStop(0, '#e0c98f');
    grad.addColorStop(1, '#a88d55');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, bottom);
    for (let x = 0; x <= W; x += 10) g.lineTo(x, w.seabedY(x));
    g.lineTo(W, bottom);
    g.closePath();
    g.fill();

    for (const r of w.rocks) {
      g.fillStyle = r.c;
      g.beginPath();
      g.ellipse(r.x, w.seabedY(r.x) + 4, r.w, r.h, 0, Math.PI, 0);
      g.fill();
    }
    const sx = Math.round(W * 0.75);
    drawStar(g, sx, w.seabedY(sx) + 8, 11, 5, 5, '#f39c4a');
    drawStar(g, 150, w.seabedY(150) + 9, 8, 3.5, 5, '#e8676b');
  }

  private seabedAnim(g: Ctx, w: FishingWorld): void {
    g.lineCap = 'round';
    for (const weed of w.weeds) {
      const baseY = w.seabedY(weed.x) + 4;
      g.strokeStyle = weed.c;
      g.lineWidth = weed.w;
      g.beginPath();
      g.moveTo(weed.x, baseY);
      for (let i = 1; i <= 6; i++) {
        const k = i / 6;
        g.lineTo(weed.x + Math.sin(w.T * 1.4 + weed.p + i * 0.7) * 6 * k, baseY - weed.h * k);
      }
      g.stroke();
    }
    g.lineCap = 'butt';
  }

  private bubbles(g: Ctx, w: FishingWorld): void {
    g.strokeStyle = 'rgba(255,255,255,.6)';
    g.lineWidth = 1;
    for (const b of w.bubbles) {
      g.beginPath();
      g.arc(b.x, b.y, b.r, 0, TAU);
      g.stroke();
    }
  }

  // ---------- Canlılar ----------
  private entity(g: Ctx, f: Fish, x: number, y: number, ang = 0, s = 1): void {
    g.save();
    g.translate(x, y);
    if (s !== 1) g.scale(s, s);
    if (f.t.hazard === 'shark') this.shark(g, f);
    else if (f.t.hazard === 'jelly') this.jelly(g, f);
    else drawCatchable(g, f.t, f, ang, this.fishGrads);
    g.restore();
  }

  private shark(g: Ctx, f: Fish): void {
    const L = f.t.len;
    const h = f.t.h;
    if (f.dir < 0) g.scale(-1, 1);
    const wag = Math.sin(f.phase * 6) * 0.18;
    g.fillStyle = '#5d6d7e';

    g.save();
    g.translate(-L * 0.45, 0);
    g.rotate(wag);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(-L * 0.2, -h * 0.9);
    g.lineTo(-L * 0.12, 0);
    g.lineTo(-L * 0.18, h * 0.6);
    g.closePath();
    g.fill();
    g.restore();

    g.beginPath();
    g.moveTo(-L * 0.1, -h * 0.4);
    g.lineTo(L * 0.02, -h * 1.05);
    g.lineTo(L * 0.12, -h * 0.38);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(L * 0.08, h * 0.2);
    g.lineTo(-L * 0.05, h * 0.8);
    g.lineTo(L * 0.18, h * 0.3);
    g.closePath();
    g.fill();

    g.beginPath();
    g.moveTo(L * 0.5, h * 0.05);
    g.quadraticCurveTo(L * 0.35, -h * 0.55, -L * 0.1, -h * 0.45);
    g.quadraticCurveTo(-L * 0.4, -h * 0.3, -L * 0.48, 0);
    g.quadraticCurveTo(-L * 0.4, h * 0.3, -L * 0.1, h * 0.42);
    g.quadraticCurveTo(L * 0.35, h * 0.5, L * 0.5, h * 0.05);
    g.closePath();
    let grad = this.fishGrads.get('kopekbaligi');
    if (!grad) {
      grad = g.createLinearGradient(0, -h / 2, 0, h / 2);
      grad.addColorStop(0, '#6c7a89');
      grad.addColorStop(0.55, '#7f8c99');
      grad.addColorStop(0.56, '#e8edf0');
      grad.addColorStop(1, '#dfe6ea');
      this.fishGrads.set('kopekbaligi', grad);
    }
    g.fillStyle = grad;
    g.fill();

    g.strokeStyle = 'rgba(0,0,0,.3)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(L * 0.2 - i * 7, -h * 0.15);
      g.lineTo(L * 0.18 - i * 7, h * 0.15);
      g.stroke();
    }
    g.fillStyle = '#111';
    circle(g, L * 0.36, -h * 0.12, 3);
    g.strokeStyle = '#333';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(L * 0.45, h * 0.16);
    g.quadraticCurveTo(L * 0.37, h * 0.3, L * 0.28, h * 0.2);
    g.stroke();
  }

  private jelly(g: Ctx, f: Fish): void {
    const r = f.t.len / 2;
    const pulse = 1 + Math.sin(f.phase * 3) * 0.08;
    g.strokeStyle = 'rgba(255,170,220,.7)';
    g.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const tx = -r * 0.7 + i * ((r * 1.4) / 4);
      g.beginPath();
      g.moveTo(tx, 0);
      for (let s = 1; s <= 6; s++) g.lineTo(tx + Math.sin(f.phase * 3 + s * 0.8 + i) * 4, s * 6);
      g.stroke();
    }
    const grad = g.createRadialGradient(0, -r * 0.4, 2, 0, -r * 0.2, r);
    grad.addColorStop(0, 'rgba(255,220,245,.95)');
    grad.addColorStop(1, 'rgba(230,120,200,.75)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(0, 0, r * pulse, (r * 0.8) / pulse, 0, Math.PI, 0);
    g.quadraticCurveTo(0, r * 0.25, -r * pulse, 0);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.beginPath();
    g.ellipse(-r * 0.3, -r * 0.45, r * 0.18, r * 0.1, -0.5, 0, TAU);
    g.fill();
  }

  // ---------- Tekne, olta, efektler ----------
  private boat(g: Ctx, w: FishingWorld): void {
    g.save();
    g.translate(w.boat.x, w.boatY());
    g.rotate(w.boat.tilt);

    g.fillStyle = '#95a5a6';
    g.beginPath();
    g.moveTo(28, -36);
    g.lineTo(50, -36);
    g.lineTo(47, -16);
    g.lineTo(31, -16);
    g.closePath();
    g.fill();
    g.fillStyle = '#7f8c8d';
    g.fillRect(27, -38, 24, 4);

    g.fillStyle = '#2e6db4';
    rr(g, -28, -54, 32, 40, 9);
    g.fill();
    g.fillStyle = '#f2c79b';
    circle(g, -12, -66, 12);
    g.fillStyle = 'rgba(230,120,100,.5)';
    circle(g, -5, -62, 3);
    g.fillStyle = '#222';
    circle(g, -4, -68, 1.8);
    g.fillStyle = '#f4d03f';
    g.beginPath();
    g.ellipse(-12, -75, 19, 5, 0, 0, TAU);
    g.fill();
    rr(g, -22, -90, 20, 16, 6);
    g.fill();
    g.fillStyle = '#e67e22';
    g.fillRect(-22, -79, 20, 3);

    g.fillStyle = '#c0392b';
    g.beginPath();
    g.moveTo(-80, -20);
    g.lineTo(80, -20);
    g.lineTo(62, 14);
    g.quadraticCurveTo(0, 22, -62, 14);
    g.closePath();
    g.fill();
    g.fillStyle = '#ecf0f1';
    g.beginPath();
    g.moveTo(-79, -18);
    g.lineTo(79, -18);
    g.lineTo(75, -10);
    g.lineTo(-75, -10);
    g.closePath();
    g.fill();
    g.fillStyle = '#8b5a2b';
    rr(g, -84, -24, 168, 6, 3);
    g.fill();
    g.fillStyle = '#fff';
    g.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('DALYAN', 0, 3);

    g.lineCap = 'round';
    g.strokeStyle = '#5a3a1a';
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(0, -30);
    g.lineTo(64, -92);
    g.stroke();
    g.fillStyle = '#34495e';
    circle(g, 10, -40, 4.5);
    g.strokeStyle = '#2e6db4';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(-8, -44);
    g.lineTo(12, -44);
    g.stroke();
    g.fillStyle = '#f2c79b';
    circle(g, 14, -44, 4.5);
    g.lineCap = 'butt';
    g.restore();
  }

  private lineAndHook(g: Ctx, w: FishingWorld): void {
    const tip = w.rodTip();
    const master = w.hooks[0];
    g.strokeStyle = 'rgba(255,255,255,.8)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(tip.x, tip.y);
    g.quadraticCurveTo(lerp(tip.x, master.x, 0.3), lerp(tip.y, master.y, 0.6), master.x, master.y - 9);
    // Kısa aralıklı ek iğneler aynı misina üzerinde biraz daha derinde dizilir.
    for (let i = 1; i < w.hooks.length; i++) g.lineTo(w.hooks[i].x, w.hooks[i].y - 9);
    g.stroke();

    for (const hook of w.hooks) this.hookGear(g, w, hook);
  }

  /** Tek bir iğnenin ucu, üzerindeki balık (varsa) ve sersemleme efekti. */
  private hookGear(g: Ctx, w: FishingWorld, hook: HookPoint): void {
    if (hook.fish) {
      const f = hook.fish;
      this.entity(g, f, f.x, f.y, f.t.junk ? 0 : -Math.PI / 2 + Math.sin(w.T * 18) * 0.25);
    }

    g.fillStyle = '#7f8c8d';
    g.beginPath();
    g.ellipse(hook.x, hook.y - 12, 3, 4, 0, 0, TAU);
    g.fill();

    const flash = hook.stun > 0 && Math.floor(w.T * 12) % 2 === 1;
    g.strokeStyle = flash ? '#ff6b6b' : '#d9dde0';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(hook.x, hook.y - 9);
    g.lineTo(hook.x, hook.y + 2);
    g.arc(hook.x - 4, hook.y + 2, 4, 0, Math.PI);
    g.lineTo(hook.x - 7, hook.y - 1);
    g.stroke();

    if (!hook.fish) {
      g.strokeStyle = '#ff8fa3';
      g.lineWidth = 3;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(hook.x - 8, hook.y + 2);
      g.quadraticCurveTo(hook.x - 10 + Math.sin(w.T * 6) * 2, hook.y + 9, hook.x - 4, hook.y + 8);
      g.stroke();
      g.lineCap = 'butt';
    }

    if (hook.stun > 0) {
      for (let i = 0; i < 3; i++) {
        const a = w.T * 6 + (i * TAU) / 3;
        drawStar(g, hook.x + Math.cos(a) * 14, hook.y - 4 + Math.sin(a) * 6, 5, 2, 5, '#ffe66d');
      }
    }
  }

  private flights(g: Ctx, w: FishingWorld): void {
    const b = w.bucketPos();
    for (const fl of w.flights) {
      const x = lerp(fl.x0, b.x, fl.t);
      const y = lerp(fl.y0, b.y, fl.t) - Math.sin(Math.PI * fl.t) * 90;
      this.entity(g, fl.f, x, y, -Math.PI / 2 + fl.t * TAU, 1 - fl.t * 0.4);
    }
  }

  private surfaceOverlay(g: Ctx, w: FishingWorld): void {
    if (!this.surfaceGrad) {
      this.surfaceGrad = g.createLinearGradient(0, SURFACE - 4, 0, SURFACE + 34);
      this.surfaceGrad.addColorStop(0, 'rgba(61,179,227,0.55)');
      this.surfaceGrad.addColorStop(1, 'rgba(61,179,227,0)');
    }
    g.fillStyle = this.surfaceGrad;
    g.beginPath();
    g.moveTo(0, SURFACE + 34);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, w.waveY(x));
    g.lineTo(W, SURFACE + 34);
    g.closePath();
    g.fill();

    g.strokeStyle = 'rgba(255,255,255,.7)';
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= W; x += 8) {
      if (x === 0) g.moveTo(x, w.waveY(x));
      else g.lineTo(x, w.waveY(x));
    }
    g.stroke();
  }

  private effects(g: Ctx, w: FishingWorld): void {
    for (const r of w.ripples) {
      g.strokeStyle = `rgba(255,255,255,${r.life * 0.7})`;
      g.lineWidth = 1.5;
      g.beginPath();
      g.ellipse(r.x, SURFACE + 2, r.r, r.r * 0.25, 0, 0, TAU);
      g.stroke();
    }
    for (const p of w.particles) {
      const a = clamp(p.life * 1.6, 0, 1);
      if (p.star) drawStar(g, p.x, p.y, p.r * 1.6, p.r * 0.6, 4, `rgba(${p.col},${a})`);
      else {
        g.fillStyle = `rgba(${p.col},${a})`;
        circle(g, p.x, p.y, p.r);
      }
    }
    for (const p of w.popups) {
      g.globalAlpha = clamp(p.life, 0, 1);
      text(g, p.str, p.x, p.y, p.size, p.color);
    }
    g.globalAlpha = 1;
  }

  // ---------- Hava ----------
  private stormSky(g: Ctx, w: FishingWorld): void {
    const d = w.weather.dim;
    if (d <= 0) return;
    g.fillStyle = `rgba(40,50,70,${d})`;
    g.fillRect(0, 0, W, SURFACE + 8);
    if (!w.weather.lightning) return;
    // Fırtına bulutları
    g.fillStyle = 'rgba(58,64,78,0.92)';
    for (let i = 0; i < 5; i++) {
      const x = ((i * 150 + w.T * 14) % (W + 260)) - 130;
      const y = 30 + (i % 2) * 28;
      circle(g, x, y, 34);
      circle(g, x + 36, y - 12, 42);
      circle(g, x + 78, y, 32);
    }
  }

  private murk(g: Ctx, w: FishingWorld): void {
    const m = w.weather.murk;
    if (m <= 0) return;
    g.fillStyle = `rgba(28,58,66,${m * 0.55})`;
    g.fillRect(0, SURFACE + 6, W, Math.max(w.worldH, w.tabanY + SEABED_BELOW) - SURFACE);
  }

  private rain(g: Ctx, w: FishingWorld): void {
    if (w.drops.length === 0) return;
    const slant = w.weather.lightning ? 0.25 : 0.1;
    g.strokeStyle = 'rgba(215,228,242,0.55)';
    g.lineWidth = 1.2;
    g.beginPath();
    for (const d of w.drops) {
      g.moveTo(d.x, d.y);
      g.lineTo(d.x + d.v * slant * 0.03, d.y - d.v * 0.03);
    }
    g.stroke();
  }

  private lantern(g: Ctx, w: FishingWorld): void {
    const p = w.boatPoint(-40, -46);
    g.save();
    g.strokeStyle = '#3b2a1a';
    g.lineWidth = 2;
    g.beginPath();
    const base = w.boatPoint(-40, -20);
    g.moveTo(base.x, base.y);
    g.lineTo(p.x, p.y);
    g.stroke();
    g.shadowColor = '#ffd97a';
    g.shadowBlur = 16;
    g.fillStyle = '#ffe9a8';
    circle(g, p.x, p.y, 5);
    g.restore();
  }

  /** Gece karanlığı: oltanın ve teknenin feneri çevresi aydınlık kalır. */
  private nightDark(g: Ctx, w: FishingWorld, scale: number): void {
    const target = g.canvas;
    const c = this.darkCanvas ?? (this.darkCanvas = document.createElement('canvas'));
    if (c.width !== target.width || c.height !== target.height) {
      c.width = target.width;
      c.height = target.height;
    }
    const d = c.getContext('2d')!;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, c.width, c.height);
    d.fillStyle = `rgba(3,8,22,${NIGHT.darkness})`;
    d.fillRect(0, 0, c.width, c.height);
    d.globalCompositeOperation = 'destination-out';
    const light = (x: number, y: number, r: number): void => {
      const sx = x * scale;
      const sy = (y - Math.round(w.camY)) * scale;
      const sr = r * scale;
      const grad = d.createRadialGradient(sx, sy, sr * 0.15, sx, sy, sr);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = grad;
      d.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    };
    light(w.hook.x, w.hook.y, NIGHT.hookLight);
    const lamp = w.boatPoint(-40, -46);
    light(lamp.x, lamp.y, NIGHT.boatLight);
    d.globalCompositeOperation = 'source-over';
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(c, 0, 0);
    g.restore();
  }

  /** Derine inince teknenin ve misinanın yeri kaybolmasın diye üstte ince bir şerit. */
  private surfaceStrip(g: Ctx, w: FishingWorld, top: number): void {
    const h = 30;
    g.fillStyle = 'rgba(8,52,84,.82)';
    g.fillRect(0, top, W, h);
    g.strokeStyle = 'rgba(255,255,255,.45)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, top + h);
    g.lineTo(W, top + h);
    g.stroke();

    const bx = clamp(w.boat.x, 24, W - 24);
    g.fillStyle = '#c0392b';
    g.beginPath();
    g.moveTo(bx - 17, top + h - 21);
    g.lineTo(bx + 17, top + h - 21);
    g.lineTo(bx + 12, top + h - 9);
    g.lineTo(bx - 12, top + h - 9);
    g.closePath();
    g.fill();
    g.fillStyle = '#ecf0f1';
    g.fillRect(bx - 16, top + h - 20, 32, 3);
    g.strokeStyle = 'rgba(255,255,255,.8)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(bx + 11, top + h - 9);
    g.lineTo(clamp(w.hook.x, 0, W), top + h);
    g.stroke();
  }
}
