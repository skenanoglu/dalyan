// DALYAN: Boğaz oyunundan (Oyun/bogaz/src) değiştirilmeden kopyalandı.
import { W, H, WORLD } from './config.js';
import { rgb } from './environment.js';

const rand = (a, b) => a + Math.random() * (b - a);
const TOWER_X = 300; // Kız Kulesi (sabit, uzak nirengi noktası)

// ---------- Partiküller: sıçrama, kabarcık, yağmur, rüzgar ----------

export class Particles {
  constructor() {
    this.list = [];
  }

  add(p) {
    if (this.list.length < 450) this.list.push(p);
  }

  splash(x, y, strength) {
    const n = Math.min(18, 6 + strength / 40);
    for (let i = 0; i < n; i++) {
      this.add({
        type: 'drop', x, y, vx: rand(-120, 120), vy: -rand(80, 120 + strength * 0.5),
        g: 900, life: 0.7, max: 0.7, size: rand(1.5, 3.5),
      });
    }
  }

  bubble(x, y) {
    this.add({ type: 'bubble', x, y, vx: rand(-40, -20), vy: rand(-50, -30), life: 1.4, max: 1.4, size: rand(1.5, 3) });
  }

  update(dt, env, speed) {
    for (const p of this.list) {
      p.life -= dt;
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const surf = env.waterY(p.x);
      if (p.type === 'bubble') {
        p.x -= speed * dt * 0.3;
        if (p.y < surf) p.life = 0;
      } else if (p.type === 'drop' && p.vy > 0 && p.y > surf) {
        p.life = 0;
      } else if ((p.type === 'rain' || p.type === 'wind') && p.y > surf) {
        p.life = 0;
      }
    }
    this.list = this.list.filter((p) => p.life > 0 && p.x > -20 && p.x < W + 40);
  }

  draw(ctx) {
    for (const p of this.list) {
      const a = Math.max(0, Math.min(1, p.life / p.max));
      if (p.type === 'drop') {
        ctx.fillStyle = `rgba(225,242,255,${0.9 * a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'bubble') {
        ctx.strokeStyle = `rgba(220,240,255,${0.7 * a})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = p.type === 'rain' ? `rgba(200,215,230,${0.55 * a})` : `rgba(235,245,255,${0.6 * a})`;
        ctx.lineWidth = p.type === 'rain' ? 1 : 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.stroke();
      }
    }
  }
}

// ---------- Siluet üretimi ----------

function makeSkyline(width) {
  const shapes = [];
  let x = 10;
  while (x < width - 20) {
    const r = Math.random();
    if (r < 0.3) {
      const rad = rand(12, 24);
      shapes.push({ type: 'dome', x: x + rad, r: rad, h: rand(14, 30) });
      shapes.push({ type: 'minaret', x: x - 4, h: rand(55, 85) });
      shapes.push({ type: 'minaret', x: x + rad * 2 + 4, h: rand(55, 85) });
      x += rad * 2 + rand(18, 30);
    } else if (r < 0.45) {
      shapes.push({ type: 'tower', x: x + 8, h: rand(60, 75) });
      x += rand(26, 40);
    } else {
      const w = rand(14, 34);
      shapes.push({ type: 'box', x, w, h: rand(12, 34) });
      x += w + rand(2, 10);
    }
  }
  return shapes;
}

function drawSkylineShape(ctx, s, x, base) {
  if (s.type === 'box') {
    ctx.fillRect(x, base - s.h, s.w, s.h);
  } else if (s.type === 'dome') {
    ctx.fillRect(x - s.r, base - s.h, s.r * 2, s.h);
    ctx.beginPath();
    ctx.arc(x, base - s.h, s.r, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - 1, base - s.h - s.r - 8, 2, 8);
  } else if (s.type === 'minaret') {
    ctx.fillRect(x - 2, base - s.h, 4, s.h);
    ctx.fillRect(x - 3.5, base - s.h * 0.72, 7, 3);
    ctx.beginPath();
    ctx.moveTo(x - 2.5, base - s.h);
    ctx.lineTo(x, base - s.h - 12);
    ctx.lineTo(x + 2.5, base - s.h);
    ctx.fill();
  } else if (s.type === 'tower') {
    // Galata Kulesi benzeri
    ctx.fillRect(x - 7, base - s.h, 14, s.h);
    ctx.fillRect(x - 9, base - s.h, 18, 5);
    ctx.beginPath();
    ctx.moveTo(x - 8, base - s.h);
    ctx.lineTo(x, base - s.h - 20);
    ctx.lineTo(x + 8, base - s.h);
    ctx.fill();
  }
}

// ---------- Dünya ----------

export class World {
  constructor() {
    this.dist = 0;
    this.skylineW = 520;
    this.skyline = makeSkyline(this.skylineW);
    this.clouds = Array.from({ length: 5 }, () => ({ x: rand(0, W), y: rand(30, 200), s: rand(0.6, 1.3) }));
    this.stars = Array.from({ length: 40 }, () => ({ x: rand(0, W), y: rand(0, 260), r: rand(0.5, 1.4) }));
    this.darkCanvas = document.createElement('canvas');
    this.k = 1;
    this.pts = [];
  }

  resize(k) {
    this.k = k;
    this.darkCanvas.width = Math.round(W * k);
    this.darkCanvas.height = Math.round(H * k);
  }

  update(dt, speed, env, particles) {
    this.dist += speed * dt;
    for (const c of this.clouds) {
      c.x -= speed * dt * 0.12 * c.s;
      if (c.x < -70) {
        c.x = W + 70;
        c.y = rand(30, 200);
      }
    }
    const p = env.pal;
    if (p.rain > 0.05) {
      const n = p.rain * dt * 140;
      for (let i = 0; i < n; i++) {
        particles.add({ type: 'rain', x: rand(0, W + 60), y: -10, vx: -90, vy: rand(550, 700), life: 1.2, max: 1.2 });
      }
    }
    const w = env.wind;
    if (w.state !== 'idle' && Math.random() < dt * 50) {
      particles.add({
        type: 'wind', x: rand(0, W + 40), y: w.dir > 0 ? rand(-10, 60) : env.level - rand(5, 60),
        vx: -220, vy: w.dir * 380, life: 0.8, max: 0.8,
      });
    }
  }

  surfacePoints(env) {
    const pts = this.pts;
    pts.length = 0;
    for (let x = 0; x <= W + 6; x += 6) pts.push(x, env.waterY(x));
    return pts;
  }

  waterPath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.lineTo(W + 6, H);
    ctx.closePath();
  }

  drawBack(ctx, env) {
    const p = env.pal;
    const level = env.level;

    // gökyüzü
    let g = ctx.createLinearGradient(0, 0, 0, level + 40);
    g.addColorStop(0, rgb(p.skyTop));
    g.addColorStop(1, rgb(p.skyBottom));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, level + 60);

    // yıldızlar
    if (p.dark > 0.4) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, (p.dark - 0.4) * 2)})`;
      for (const s of this.stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (0.8 + 0.2 * Math.sin(env.t * 3 + s.x)), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // güneş / ay
    ctx.save();
    ctx.shadowColor = rgb(p.sun, 0.8);
    ctx.shadowBlur = 30;
    ctx.fillStyle = rgb(p.sun);
    ctx.beginPath();
    ctx.arc(80, p.sunY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // bulutlar
    ctx.fillStyle = rgb(p.cloud, 0.85);
    for (const c of this.clouds) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 14 * c.s, 0, Math.PI * 2);
      ctx.arc(c.x + 16 * c.s, c.y - 6 * c.s, 17 * c.s, 0, Math.PI * 2);
      ctx.arc(c.x + 34 * c.s, c.y, 13 * c.s, 0, Math.PI * 2);
      ctx.fill();
    }

    // uzak katman: Boğaziçi Köprüsü
    const base = level + 4;
    ctx.fillStyle = rgb(p.far);
    ctx.strokeStyle = rgb(p.far);
    const bOff = (this.dist * 0.05) % 900;
    const bx = 420 - bOff;
    ctx.fillRect(bx, base - 95, 6, 95);
    ctx.fillRect(bx + 170, base - 95, 6, 95);
    ctx.fillRect(bx - 60, base - 34, 300, 5);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx - 60, base - 34);
    ctx.quadraticCurveTo(bx - 25, base - 60, bx + 3, base - 95);
    ctx.quadraticCurveTo(bx + 88, base - 20, bx + 173, base - 95);
    ctx.quadraticCurveTo(bx + 200, base - 60, bx + 240, base - 34);
    ctx.stroke();

    // şehir silueti
    ctx.fillStyle = rgb(p.silhouette);
    const off = (this.dist * 0.12) % this.skylineW;
    for (let k = 0; k < 2; k++) {
      for (const s of this.skyline) drawSkylineShape(ctx, s, s.x - off + k * this.skylineW, base);
    }

    // Kız Kulesi
    ctx.beginPath();
    ctx.ellipse(TOWER_X, level + 2, 28, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(TOWER_X - 9, level - 38, 18, 38);
    ctx.fillRect(TOWER_X - 5, level - 52, 10, 14);
    ctx.beginPath();
    ctx.moveTo(TOWER_X - 7, level - 52);
    ctx.lineTo(TOWER_X, level - 68);
    ctx.lineTo(TOWER_X + 7, level - 52);
    ctx.fill();
    if (p.dark > 0.25) {
      ctx.save();
      ctx.shadowColor = '#ffe08a';
      ctx.shadowBlur = 16;
      ctx.fillStyle = `rgba(255,224,138,${Math.min(1, p.dark * 1.2)})`;
      ctx.fillRect(TOWER_X - 3, level - 49, 6, 6);
      ctx.restore();
    }

    // su gövdesi
    const pts = this.surfacePoints(env);
    g = ctx.createLinearGradient(0, level - 10, 0, H);
    g.addColorStop(0, rgb(p.waterTop));
    g.addColorStop(1, rgb(p.waterBottom));
    ctx.fillStyle = g;
    this.waterPath(ctx, pts);
    ctx.fill();

    // su altı ışık huzmeleri
    const rayA = 0.06 * (1 - p.dark);
    if (rayA > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${rayA})`;
      for (let i = 0; i < 4; i++) {
        const rx = ((i * 110 - this.dist * 0.2) % 440 + 440) % 440 - 40;
        ctx.beginPath();
        ctx.moveTo(rx, level);
        ctx.lineTo(rx + 30, level);
        ctx.lineTo(rx - 40, WORLD.seabed);
        ctx.lineTo(rx - 90, WORLD.seabed);
        ctx.closePath();
        ctx.fill();
      }
    }

    // deniz tabanı ve yosunlar
    ctx.fillStyle = rgb(p.sand);
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, WORLD.seabed + Math.sin((x + this.dist) * 0.04) * 3);
    ctx.lineTo(W, H);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,140,80,0.7)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const sOff = this.dist % 70;
    for (let x = -sOff; x < W + 20; x += 70) {
      const h = 22 + ((x + this.dist) * 7 % 18);
      ctx.beginPath();
      ctx.moveTo(x, WORLD.seabed + 2);
      ctx.quadraticCurveTo(x + Math.sin(env.t * 2 + x) * 8, WORLD.seabed - h / 2, x + Math.sin(env.t * 2 + x + 1) * 5, WORLD.seabed - h);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  // Engeller ve karakter çizildikten sonra: su altındaki her şeye hafif renk ver ve yüzeyi parlat.
  drawFront(ctx, env) {
    const p = env.pal;
    const pts = this.pts;
    ctx.fillStyle = rgb(p.waterTop, 0.24);
    this.waterPath(ctx, pts);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) {
      if (i === 0) ctx.moveTo(pts[i], pts[i + 1]);
      else ctx.lineTo(pts[i], pts[i + 1]);
    }
    ctx.stroke();
  }

  // Gece karanlığı: karakterin etrafı ve Kız Kulesi feneri aydınlık kalır.
  drawDark(ctx, env, player) {
    const dark = env.pal.dark;
    if (dark < 0.02) return;
    const c = this.darkCanvas;
    const d = c.getContext('2d');
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.clearRect(0, 0, c.width, c.height);
    d.setTransform(this.k, 0, 0, this.k, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.fillStyle = `rgba(3,6,18,${dark})`;
    d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    if (player) {
      const g = d.createRadialGradient(player.x, player.y, 20, player.x, player.y, 140);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.fillRect(0, 0, W, H);
    }
    const lx = TOWER_X;
    const ly = env.level - 46;
    const a = Math.PI + Math.sin(env.t * 0.7) * 0.9;
    const g = d.createRadialGradient(lx, ly, 0, lx, ly, 520);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g;
    d.beginPath();
    d.moveTo(lx, ly);
    d.arc(lx, ly, 520, a - 0.14, a + 0.14);
    d.closePath();
    d.fill();
    d.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  }
}
