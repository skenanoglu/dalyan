// DALYAN: Boğaz oyunundan kopyalandı; kalp (can) toplanabiliri çıkarıldı, sadece martı engelleri.
import { WORLD, TIDE } from './config.js';
import { difficulty } from './environment.js';
import { hitsShapes, circleCircle } from './collision.js';
import { drawGull } from './characters.js';

const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Gelgit en yüksekteyken bile havada kalan en alçak y.
const AIR_LOW = WORLD.waterBase - TIDE.ampMax - 20;

function pick(weights) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let r = Math.random() * total;
  for (const k in weights) {
    r -= weights[k];
    if (r <= 0) return k;
  }
  return Object.keys(weights)[0];
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.fill();
}

export function drawHeart(ctx, x, y, size, color = '#ff3b5c') {
  ctx.save();
  ctx.translate(x, y + size * 0.1);
  ctx.scale(size / 17, size / 17);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-7, 1, -9, -3, -8, -6);
  ctx.bezierCurveTo(-7, -9.5, -2, -10, 0, -6);
  ctx.bezierCurveTo(2, -10, 7, -9.5, 8, -6);
  ctx.bezierCurveTo(9, -3, 7, 1, 0, 6);
  ctx.fill();
  ctx.restore();
}

// ---------- Engeller ----------

class Column {
  constructor(x, gapY, gapH) {
    this.type = 'column';
    this.x = x;
    this.w = 56;
    this.gapY = gapY;
    this.gapH = gapH;
    this.t = 0;
  }

  get top() { return this.gapY - this.gapH / 2; }
  get bot() { return this.gapY + this.gapH / 2; }

  shapes() {
    return [
      { kind: 'rect', x: this.x, y: -50, w: this.w, h: this.top + 50 },
      { kind: 'rect', x: this.x, y: this.bot, w: this.w, h: WORLD.seabed - this.bot + 40 },
    ];
  }

  draw(ctx) {
    const { x, w, top, bot } = this;
    // üst: ahşap iskele ayağı
    let g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#5a3a1e');
    g.addColorStop(0.5, '#9c6b3f');
    g.addColorStop(1, '#5a3a1e');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, w, top);
    ctx.strokeStyle = 'rgba(40,25,10,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let yy = top - 30; yy > 0; yy -= 34) {
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy);
    }
    ctx.stroke();
    ctx.fillStyle = '#43290f';
    ctx.fillRect(x - 5, top - 12, w + 10, 12);

    // alt: kaya ve mercan
    g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#4e5560');
    g.addColorStop(0.5, '#8a929c');
    g.addColorStop(1, '#4e5560');
    ctx.fillStyle = g;
    rrect(ctx, x, bot, w, WORLD.seabed - bot + 10, 12);
    const corals = ['#ff7f6e', '#ffb347', '#ff6f91'];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = corals[i % 3];
      circle(ctx, x + 6 + (i * (w - 12)) / 4, bot + 3, 6.5);
    }
  }
}

class Ferry {
  constructor(x, d) {
    this.type = 'ferry';
    this.x = x;
    this.w = 130;
    this.netDepth = lerp(70, 120, d);
    this.t = 0;
  }

  surf(env) { return env.waterY(this.x + this.w / 2); }

  shapes(env) {
    const s = this.surf(env);
    return [
      { kind: 'rect', x: this.x, y: s - 26, w: this.w, h: 40 },
      { kind: 'rect', x: this.x + 22, y: s - 52, w: 84, h: 26 },
      { kind: 'rect', x: this.x + 58, y: s - 70, w: 12, h: 18 },
      { kind: 'rect', x: this.x + 24, y: s + 14, w: 84, h: this.netDepth },
    ];
  }

  draw(ctx, env) {
    const s = this.surf(env);
    const { x, w } = this;

    // ağ
    const nt = s + 14;
    const nb = nt + this.netDepth;
    ctx.strokeStyle = 'rgba(225,225,205,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let xx = x + 24; xx <= x + 108; xx += 12) {
      ctx.moveTo(xx, nt);
      ctx.lineTo(xx, nb);
    }
    for (let yy = nt; yy <= nb; yy += 12) {
      ctx.moveTo(x + 24, yy);
      ctx.lineTo(x + 108, yy);
    }
    ctx.stroke();
    ctx.fillStyle = '#e0a526';
    for (let xx = x + 24; xx <= x + 109; xx += 21) circle(ctx, xx, nb, 3);

    // gövde
    ctx.fillStyle = '#1f2a36';
    ctx.beginPath();
    ctx.moveTo(x, s - 8);
    ctx.lineTo(x + w, s - 8);
    ctx.lineTo(x + w - 12, s + 14);
    ctx.lineTo(x + 12, s + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f4f4f0';
    ctx.fillRect(x, s - 26, w, 18);
    ctx.fillStyle = '#2d4a6b';
    for (let xx = x + 8; xx < x + w - 8; xx += 14) ctx.fillRect(xx, s - 21, 8, 7);

    // kabin ve baca
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 22, s - 52, 84, 26);
    ctx.fillStyle = '#3b6a94';
    for (let xx = x + 28; xx < x + 100; xx += 13) ctx.fillRect(xx, s - 46, 8, 9);
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(x + 58, s - 70, 12, 18);
    ctx.fillStyle = '#f2c230';
    ctx.fillRect(x + 58, s - 64, 12, 5);

    // bayrak
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + w - 8, s - 26);
    ctx.lineTo(x + w - 8, s - 48);
    ctx.stroke();
    ctx.fillStyle = '#e30a17';
    ctx.fillRect(x + w - 8, s - 48, 12 + Math.sin(this.t * 8), 8);
  }
}

class Flock {
  constructor(x, rival) {
    this.type = 'flock';
    this.x = x;
    this.rival = rival;
    this.t = 0;
    const n = Math.random() < 0.5 ? 2 : 3;
    this.birds = [];
    for (let i = 0; i < n; i++) {
      this.birds.push({
        dx: i * 55 + 15,
        baseY: rand(60, AIR_LOW - 30),
        amp: rand(18, 34),
        phase: rand(0, Math.PI * 2),
      });
    }
    this.w = (n - 1) * 55 + 30;
  }

  birdY(b) { return b.baseY + Math.sin(this.t * 3 + b.phase) * b.amp; }

  shapes() {
    return this.birds.map((b) => ({ kind: 'circle', x: this.x + b.dx, y: this.birdY(b), r: 11 }));
  }

  draw(ctx) {
    for (const b of this.birds) {
      ctx.save();
      ctx.translate(this.x + b.dx, this.birdY(b));
      ctx.scale(-1, 1);
      drawGull(ctx, { inWater: false, flap: 1, t: this.t * 0.4 + b.phase, rival: this.rival });
      ctx.restore();
    }
  }
}

class Jellies {
  constructor(x) {
    this.type = 'jelly';
    this.x = x;
    this.t = 0;
    const n = Math.random() < 0.5 ? 2 : 3;
    this.list = [];
    for (let i = 0; i < n; i++) {
      this.list.push({ dx: i * 50 + 15, off: rand(55, 200), amp: rand(25, 40), phase: rand(0, Math.PI * 2) });
    }
    this.w = (n - 1) * 50 + 30;
  }

  jellyY(env, j) {
    const y = env.level + j.off + Math.sin(this.t * 2 + j.phase) * j.amp;
    return Math.min(y, WORLD.seabed - 25);
  }

  shapes(env) {
    return this.list.map((j) => ({ kind: 'circle', x: this.x + j.dx, y: this.jellyY(env, j), r: 12 }));
  }

  draw(ctx, env) {
    for (const j of this.list) {
      const x = this.x + j.dx;
      const y = this.jellyY(env, j);
      ctx.fillStyle = 'rgba(255,120,200,0.18)';
      circle(ctx, x, y, 20);
      ctx.strokeStyle = 'rgba(255,190,230,0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = -1.5; k <= 1.5; k++) {
        const tx = x + k * 5;
        ctx.moveTo(tx, y + 2);
        for (let s = 1; s <= 4; s++) {
          ctx.lineTo(tx + Math.sin(this.t * 5 + s + k) * 2.5, y + 2 + s * 5);
        }
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,165,220,0.9)';
      ctx.beginPath();
      ctx.arc(x, y + 2, 12, Math.PI, 0);
      ctx.quadraticCurveTo(x + 6, y + 6, x, y + 3);
      ctx.quadraticCurveTo(x - 6, y + 6, x - 12, y + 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      circle(ctx, x - 4, y - 4, 3);
    }
  }
}

// Sadece Martı modunda: havayı neredeyse kapatır, kısa bir dalışa zorlar.
class LowBridge {
  constructor(x) {
    this.type = 'lowBridge';
    this.x = x;
    this.w = 80;
    this.deckBottom = WORLD.waterBase - 18;
    this.t = 0;
  }

  shapes() {
    const db = this.deckBottom;
    return [
      { kind: 'rect', x: this.x + 10, y: -50, w: this.w - 20, h: db - 30 + 50 },
      { kind: 'rect', x: this.x - 10, y: db - 30, w: this.w + 20, h: 30 },
    ];
  }

  draw(ctx) {
    const { x, w } = this;
    const db = this.deckBottom;
    ctx.fillStyle = '#7b7f86';
    ctx.fillRect(x + 10, 0, w - 20, db - 30);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let yy = 12, row = 0; yy < db - 30; yy += 16, row++) {
      ctx.moveTo(x + 10, yy);
      ctx.lineTo(x + w - 10, yy);
      const off = row % 2 ? 15 : 0;
      for (let xx = x + 10 + off; xx < x + w - 10; xx += 30) {
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx, yy + 16);
      }
    }
    ctx.stroke();
    ctx.fillStyle = '#4b5058';
    ctx.fillRect(x - 10, db - 30, w + 20, 30);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x - 10, db - 30, w + 20, 4);
    ctx.fillStyle = '#ffd86b';
    circle(ctx, x - 4, db - 36, 3);
    circle(ctx, x + w + 4, db - 36, 3);
  }
}

// Galata Köprüsü: köprüden sarkan oltaların iğneleri suya inip çıkar.
class Galata {
  constructor(x) {
    this.type = 'galata';
    this.x = x;
    this.w = 170;
    this.deckY = 40;
    this.deckH = 30;
    this.t = 0;
    const n = Math.random() < 0.5 ? 3 : 4;
    this.lines = [];
    for (let i = 0; i < n; i++) {
      this.lines.push({ dx: 25 + (i * 120) / (n - 1), phase: rand(0, Math.PI * 2) });
    }
  }

  hookY(env, l) {
    return env.level + 40 + Math.sin(this.t * 1.4 + l.phase) * 90;
  }

  shapes(env) {
    const deckBottom = this.deckY + this.deckH;
    const out = [{ kind: 'rect', x: this.x, y: -50, w: this.w, h: deckBottom + 50 }];
    for (const l of this.lines) {
      const hy = this.hookY(env, l);
      out.push({ kind: 'rect', x: this.x + l.dx - 2, y: deckBottom, w: 4, h: hy - deckBottom });
      out.push({ kind: 'circle', x: this.x + l.dx, y: hy + 4, r: 6 });
    }
    return out;
  }

  draw(ctx, env) {
    const { x, w, deckY, deckH } = this;
    // misinalar ve iğneler
    for (const l of this.lines) {
      const lx = x + l.dx;
      const hy = this.hookY(env, l);
      ctx.strokeStyle = 'rgba(235,235,235,0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, deckY - 14);
      ctx.lineTo(lx, hy);
      ctx.stroke();
      ctx.strokeStyle = '#cfd6dd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lx - 3, hy + 3, 4, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#e74c3c';
      circle(ctx, lx, hy + 1, 2.5);
    }
    // köprü tabliyesi
    ctx.fillStyle = '#39424e';
    ctx.fillRect(x, deckY, w, deckH);
    ctx.fillStyle = '#5b6674';
    ctx.fillRect(x, deckY, w, 5);
    ctx.fillStyle = '#2a3038';
    for (let xx = x + 4; xx < x + w; xx += 14) ctx.fillRect(xx, deckY + 10, 3, deckH - 10);
    // balıkçılar ve kamışlar
    for (const l of this.lines) {
      const fx = x + l.dx - 12;
      ctx.fillStyle = '#1d232b';
      circle(ctx, fx, deckY - 17, 3.5);
      ctx.fillRect(fx - 3, deckY - 13, 6, 13);
      ctx.strokeStyle = '#1d232b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fx + 2, deckY - 9);
      ctx.lineTo(x + l.dx, deckY - 14);
      ctx.stroke();
    }
  }
}

// ---------- Toplanabilirler ----------

class Item {
  // rel: su seviyesine göre konumlanır (gelgitle birlikte hareket eder)
  constructor(kind, x, y, env, rel) {
    this.kind = kind;
    this.x = x;
    this.rel = rel;
    this.off = rel ? y - env.level : y;
    this.t = rand(0, 6);
    this.r = 11;
  }

  y(env) {
    return (this.rel ? env.level + this.off : this.off) + Math.sin(this.t * 3) * 3;
  }

  draw(ctx, env) {
    const x = this.x;
    const y = this.y(env);
    ctx.save();
    ctx.shadowBlur = 12;
    if (this.kind === 'kalp') {
      ctx.shadowColor = '#ff6b8a';
      drawHeart(ctx, x, y, 22 * (1 + 0.1 * Math.sin(this.t * 6)));
    } else if (this.kind === 'simit') {
      ctx.shadowColor = '#ffcf6b';
      ctx.strokeStyle = '#b5651d';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f7e3b5';
      for (let a = 0; a < 6.2; a += 0.9) circle(ctx, x + Math.cos(a) * 7, y + Math.sin(a) * 7, 0.9);
    } else {
      ctx.shadowColor = '#ffffff';
      const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 8);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#c9d8ea');
      ctx.fillStyle = g;
      circle(ctx, x, y, 8);
    }
    ctx.restore();
  }
}

// ---------- Yönetici ----------

export class Obstacles {
  constructor() {
    this.onSpawn = null;
    this.reset(null);
  }

  reset(cfg) {
    this.cfg = cfg;
    this.list = [];
    this.items = [];
    this.nextIn = 0;
    this.count = 0;
    this.lastType = null;
    this.lastGapY = WORLD.waterBase;
  }

  update(dt, speed, env, score) {
    const dx = speed * dt;
    for (const o of this.list) {
      o.x -= dx;
      o.t += dt;
    }
    for (const it of this.items) {
      it.x -= dx;
      it.t += dt;
    }
    this.nextIn -= dx;
    if (this.nextIn <= 0) {
      const o = this.spawn(env, score);
      const d = difficulty(score);
      this.nextIn = o.w + lerp(WORLD.spacingMax, WORLD.spacingMin, d);
    }
    this.list = this.list.filter((o) => o.x + o.w > -80);
    this.items = this.items.filter((it) => !it.taken && it.x > -40);
  }

  weights(score) {
    if (this.count < 3) return { column: 1 };
    const late = score >= 5 ? 1.5 : 0;
    return { column: 3, ferry: 1.5, flock: 2, jelly: 1, lowBridge: late, galata: late };
  }

  spawn(env, score) {
    const cfg = this.cfg;
    const d = difficulty(score);
    const x = 360 + 20;
    const weights = this.weights(score);
    let type = pick(weights);
    if (type === this.lastType && type !== 'column') type = pick(weights);
    this.lastType = type;
    this.count++;

    const ownItem = cfg.collectible;
    let o;
    let item = null; // [x, y, rel]

    if (type === 'column') {
      const gapH = lerp(175, 140, d);
      const m = pick(cfg.gapBias);
      let cy;
      if (m === 'air') cy = rand(gapH / 2 + 25, AIR_LOW);
      else if (m === 'surface') cy = WORLD.waterBase + rand(-20, 20);
      else cy = WORLD.waterBase + rand(cfg.diveDepth[0], cfg.diveDepth[1]);
      // Ardışık boşluklar arasında ulaşılamayacak kadar büyük sıçrama olmasın.
      cy = clamp(cy, this.lastGapY - 260, this.lastGapY + 260);
      cy = clamp(cy, gapH / 2 + 20, WORLD.seabed - gapH / 2 - 15);
      this.lastGapY = cy;
      o = new Column(x, cy, gapH);
      if (Math.random() < 0.35) item = [x + o.w / 2, cy + (Math.random() < 0.5 ? -1 : 1) * gapH * 0.25, false];
    } else if (type === 'ferry') {
      o = new Ferry(x, d);
      const s = WORLD.waterBase;
      item = ownItem === 'simit'
        ? [x + o.w / 2, s - 95, true]
        : [x + o.w / 2, s + 14 + o.netDepth + 28, true];
      if (Math.random() < 0.4) item = null;
    } else if (type === 'flock') {
      o = new Flock(x, cfg.id === 'marti');
      if (ownItem === 'simit' && Math.random() < 0.5) item = [x + o.w / 2, rand(80, AIR_LOW - 20), false];
    } else if (type === 'jelly') {
      o = new Jellies(x);
      if (ownItem === 'inci' && Math.random() < 0.5) item = [x + o.w / 2, WORLD.waterBase + rand(60, 180), true];
    } else if (type === 'lowBridge') {
      o = new LowBridge(x);
      if (Math.random() < 0.5) item = [x + o.w / 2, WORLD.waterBase + 30, true];
    } else {
      o = new Galata(x);
      if (Math.random() < 0.5) {
        item = ownItem === 'simit'
          ? [x + o.w / 2, WORLD.waterBase - 25, true]
          : [x + o.w / 2, WORLD.waterBase + 170, true];
      }
    }

    this.list.push(o);

    if (item) this.items.push(new Item(ownItem, item[0], item[1], env, item[2]));

    if (this.onSpawn) this.onSpawn(o.type);
    return o;
  }

  collides(player, env) {
    const r = player.r * 0.8;
    for (const o of this.list) {
      if (o.x > player.x + 40 || o.x + o.w < player.x - 40) continue;
      if (hitsShapes(player.x, player.y, r, o.shapes(env))) return o.type;
    }
    return null;
  }

  collect(player, env) {
    const taken = [];
    for (const it of this.items) {
      if (!it.taken && circleCircle(player.x, player.y, player.r, it.x, it.y(env), it.r)) {
        it.taken = true;
        taken.push(it);
      }
    }
    return taken;
  }

  countPassed(playerX) {
    let n = 0;
    for (const o of this.list) {
      if (!o.passed && o.x + o.w < playerX) {
        o.passed = true;
        n++;
      }
    }
    return n;
  }

  draw(ctx, env) {
    for (const o of this.list) o.draw(ctx, env);
    for (const it of this.items) it.draw(ctx, env);
  }
}
