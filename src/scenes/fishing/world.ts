import type { Catch, SpeciesId, WeatherId, ZoneId } from '../../app/types';
import { NIGHT, WEATHER, type WeatherDef } from '../../app/weather';
import { BAIT_PULL } from '../../app/gear';
import { ZONES } from '../../app/zones';
import { TYPES, ZONE_DEPTH_PX, type FishType } from './data';

// Balık Avı'nın dünya mantığı (BalikAvi/js/dunya.js) dikey ekrana ve modüle uyarlandı.
// Genişlik sabit, yükseklik ekran oranından gelir.

export const W = 540;
export const SURFACE = 180;
export const HOOK_TOP = SURFACE - 30;
export const BASE_TIME = 90;
export const TAU = Math.PI * 2;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export interface Fish {
  t: FishType;
  x: number;
  y: number;
  baseY: number;
  dir: 1 | -1;
  speed: number;
  phase: number;
  caught: boolean;
  cool: number;
}

export interface Bubble { x: number; y: number; r: number; v: number; w: number }
export interface Ripple { x: number; r: number; life: number }
export interface Particle { x: number; y: number; vx: number; vy: number; g: number; life: number; r: number; col: string; star?: boolean }
export interface Popup { x: number; y: number; str: string; color: string; size: number; life: number }
export interface Flight { f: Fish; x0: number; y0: number; t: number }
export interface Cloud { x: number; y: number; s: number; v: number }
export interface Bird { x: number; y: number; v: number; p: number }
export interface Weed { x: number; h: number; c: string; w: number; p: number }
export interface Rock { x: number; w: number; h: number; c: string }
export interface Drop { x: number; y: number; v: number }

export type FishingEvent = 'start' | 'splash' | 'catch' | 'score' | 'gold' | 'bad' | 'zap' | 'tick' | 'thunder' | 'end';

export interface WorldOptions {
  zone: ZoneId;
  /** Ekranın dünya birimindeki yüksekliği. */
  viewHeight: number;
  misinaM: number;
  inisHizi: number;
  makara: number;
  bonusSeconds: number;
  /** Takılı yemin sevdiği türler daha sık görünür. */
  baitLikes: SpeciesId[];
  /** Hava (varsayılan güneşli). */
  weather?: WeatherId;
  /** Gece mi (varsayılan gündüz). */
  night?: boolean;
  random?: () => number;
}

/** Dar ekranda aynı kalabalık hissi için bölgenin balık sınırı bu oranla çarpılır. */
const PORTRAIT_DENSITY = 0.8;

export class FishingWorld {
  readonly zoneId: ZoneId;
  readonly zoneName: string;
  readonly zoneMetre: number;
  readonly tabanY: number;
  readonly worldH: number;
  readonly pxMetre: number;
  readonly maxFish: number;
  readonly totalTime: number;
  readonly misinaM: number;
  readonly inisHizi: number;
  readonly makara: number;
  readonly baitLikes: ReadonlySet<SpeciesId>;
  readonly weather: WeatherDef;
  readonly night: boolean;

  H: number;
  T = 0;
  timeLeft: number;
  lastTick: number;
  over = false;
  hookHasEntered = false;
  camY = 0;

  readonly boat = { x: W / 2 - 60, vx: 0, tilt: 0 };
  readonly hook: { x: number; y: number; fish: Fish | null; stun: number } = { x: 0, y: HOOK_TOP, fish: null, stun: 0 };
  fishes: Fish[] = [];
  bubbles: Bubble[] = [];
  ripples: Ripple[] = [];
  particles: Particle[] = [];
  popups: Popup[] = [];
  flights: Flight[] = [];
  clouds: Cloud[] = [];
  birds: Bird[] = [];
  weeds: Weed[] = [];
  rocks: Rock[] = [];
  spawnTimer = 0;
  /** Fırtınada rüzgârın yönü (-1 sol, 1 sağ, 0 yok). */
  windDir = 0;
  windTimer = 1.5;
  /** Şimşek parlaması (0-1). */
  flash = 0;
  drops: Drop[] = [];

  readonly catch: Catch = {};
  /** Ses ve titreşim için; sahne her karede boşaltır. */
  events: FishingEvent[] = [];
  private readonly rnd: () => number;

  constructor(o: WorldOptions) {
    const zone = ZONES[o.zone];
    this.rnd = o.random ?? Math.random;
    this.zoneId = o.zone;
    this.zoneName = zone.name;
    this.zoneMetre = zone.depth;
    this.H = o.viewHeight;
    const depthPx = Math.max(ZONE_DEPTH_PX[o.zone], Math.round(o.viewHeight - SURFACE - 70));
    this.tabanY = SURFACE + depthPx;
    this.worldH = Math.max(o.viewHeight, this.tabanY + 40);
    this.pxMetre = (depthPx - 40) / zone.depth;
    this.maxFish = Math.max(6, Math.round(zone.maxFish * PORTRAIT_DENSITY));
    this.totalTime = BASE_TIME + Math.max(0, o.bonusSeconds);
    this.timeLeft = this.totalTime;
    this.lastTick = this.totalTime;
    this.misinaM = o.misinaM;
    this.inisHizi = o.inisHizi;
    this.makara = o.makara;
    this.baitLikes = new Set(o.baitLikes);
    this.weather = WEATHER[o.weather ?? 'gunes'];
    this.night = o.night ?? false;
    this.scatterDecor();
    this.hook.x = this.rodTip().x;
  }

  // ---------- Yardımcılar ----------
  rand(a: number, b: number): number {
    return a + this.rnd() * (b - a);
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.rnd() * arr.length)];
  }

  boatY(): number {
    return SURFACE + Math.sin(this.T * 2) * 3;
  }

  /** Teknenin kendi koordinatındaki bir noktayı dünya koordinatına çevirir. */
  boatPoint(px: number, py: number): { x: number; y: number } {
    const c = Math.cos(this.boat.tilt);
    const s = Math.sin(this.boat.tilt);
    return { x: this.boat.x + px * c - py * s, y: this.boatY() + px * s + py * c };
  }

  rodTip(): { x: number; y: number } {
    return this.boatPoint(64, -92);
  }

  bucketPos(): { x: number; y: number } {
    return this.boatPoint(39, -36);
  }

  depthMetre(y: number): number {
    return (y - SURFACE) / this.pxMetre;
  }

  metreToY(m: number): number {
    return SURFACE + 25 + m * this.pxMetre;
  }

  seabedY(x: number): number {
    return this.tabanY + Math.sin(x * 0.015) * 6 + Math.sin(x * 0.043 + 1) * 3;
  }

  waveY(x: number): number {
    return SURFACE + Math.sin(x * 0.02 + this.T * 2) * 3 + Math.sin(x * 0.051 - this.T * 1.3) * 1.8;
  }

  /** Misinanın izin verdiği en derin nokta. */
  hookFloor(): number {
    return Math.min(this.seabedY(this.hook.x) - 28, SURFACE + this.misinaM * this.pxMetre);
  }

  setViewHeight(h: number): void {
    this.H = h;
  }

  private scatterDecor(): void {
    const k = W / 960;
    this.clouds = Array.from({ length: Math.round(6 * k) }, () => ({ x: this.rand(0, W), y: this.rand(25, 110), s: this.rand(0.6, 1.1), v: this.rand(6, 16) }));
    this.birds = Array.from({ length: 3 }, () => ({ x: this.rand(0, W), y: this.rand(40, 120), v: this.rand(25, 45), p: this.rand(0, 6) }));
    this.weeds = Array.from({ length: Math.round(14 * k) }, () => ({
      x: this.rand(10, W - 10),
      h: this.rand(40, 110),
      c: this.pick(['#2e8b57', '#3aa55d', '#1f7a4a', '#58b368']),
      w: this.rand(4, 7),
      p: this.rand(0, 6),
    }));
    this.rocks = Array.from({ length: Math.round(7 * k) }, () => ({
      x: this.rand(0, W),
      w: this.rand(25, 60),
      h: this.rand(15, 30),
      c: this.pick(['#5b6770', '#6d7a84', '#4f5a62']),
    }));
  }

  // ---------- Akış ----------
  start(): void {
    for (let i = 0; i < Math.round(this.maxFish * 0.6); i++) this.spawnFish(true);
    this.events.push('start');
  }

  end(): void {
    if (this.over) return;
    this.timeLeft = 0;
    this.over = true;
    if (this.hook.fish) {
      this.fishes.splice(this.fishes.indexOf(this.hook.fish), 1);
      this.hook.fish = null;
    }
    this.events.push('end');
  }

  spawnFish(anywhere: boolean): void {
    const sharks = this.fishes.filter((f) => f.t.hazard === 'shark').length;
    const jellies = this.fishes.filter((f) => f.t.hazard === 'jelly').length;
    // çöp ve denizanası çok yavaş; sınır konmazsa ekranda birikip balığa yer bırakmıyorlar
    const junk = this.fishes.filter((f) => f.t.junk).length;
    const progress = 1 - this.timeLeft / this.totalTime;

    // Yalnızca kameranın gördüğü derinlik kuşağına doğur.
    const topM = Math.max(0, this.depthMetre(this.camY + 20) - 3);
    const bottomM = Math.min(this.zoneMetre, this.depthMetre(this.camY + this.H) + 3);

    const pool: [FishType, number, number, number][] = [];
    let total = 0;
    for (const t of TYPES) {
      let w = t.weight;
      if (t.hazard === 'shark') w = sharks >= 1 ? 0 : w * (0.5 + progress * 1.5) * this.weather.sharkWeight;
      if (t.hazard === 'jelly' && jellies >= 3) w = 0;
      if (t.junk) w = junk >= this.weather.junkCap ? 0 : w * this.weather.junkWeight;
      if (t.species && this.baitLikes.has(t.species)) w *= BAIT_PULL;
      if (this.night && t.species) {
        if (NIGHT.likes.includes(t.species)) w *= NIGHT.likeX;
        else if (NIGHT.dislikes.includes(t.species)) w *= NIGHT.dislikeX;
      }
      // Gece fener balığı sığa çıkar.
      const minM = this.night && t.key === 'fener' ? Math.min(t.metre[0], NIGHT.fenerRise) : t.metre[0];
      const lo = Math.max(minM, topM);
      const hi = Math.min(t.metre[1], bottomM);
      if (hi < lo) w = 0;
      if (w > 0) {
        pool.push([t, w, lo, hi]);
        total += w;
      }
    }
    if (pool.length === 0) return;
    let r = this.rnd() * total;
    let chosen = pool[0];
    for (const p of pool) {
      if ((r -= p[1]) <= 0) {
        chosen = p;
        break;
      }
    }
    const t = chosen[0];
    const dir: 1 | -1 = this.rnd() < 0.5 ? 1 : -1;
    const baseY = this.metreToY(this.rand(chosen[2], chosen[3]));
    const x = anywhere ? this.rand(60, W - 60) : dir > 0 ? -t.len : W + t.len;
    this.fishes.push({ t, x, y: baseY, baseY, dir, speed: this.rand(t.speed[0], t.speed[1]) * this.weather.fishSpeed, phase: this.rand(0, 10), caught: false, cool: 0 });
  }

  hits(f: Fish, px: number, py: number, pad = 0): boolean {
    const dx = (px - f.x) / (f.t.len / 2 + pad);
    const dy = (py - f.y) / (f.t.h / 2 + pad);
    return dx * dx + dy * dy < 1;
  }

  popup(x: number, y: number, str: string, color: string, size = 22): void {
    this.popups.push({ x: clamp(x, 110, W - 110), y, str, color, size, life: 1.4 });
  }

  splashAt(x: number, strong: boolean): void {
    if (strong) this.events.push('splash');
    const n = strong ? 12 : 6;
    for (let i = 0; i < n; i++) {
      this.particles.push({ x, y: SURFACE, vx: this.rand(-70, 70), vy: this.rand(-170, -60), g: 500, life: this.rand(0.4, 0.7), r: this.rand(1.5, 3), col: '220,240,255' });
    }
    this.ripples.push({ x, r: 4, life: 1 });
  }

  sparkles(x: number, y: number, n: number, col = '255,215,80'): void {
    for (let i = 0; i < n; i++) {
      const a = this.rand(0, TAU);
      const s = this.rand(40, 140);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0, life: this.rand(0.5, 0.9), r: this.rand(2, 4), col, star: true });
    }
  }

  // ---------- Güncelleme ----------
  update(dt: number, input: Input): void {
    this.T += dt;
    if (!this.over) {
      this.timeLeft -= dt;
      const sec = Math.ceil(this.timeLeft);
      if (sec < this.lastTick) {
        this.lastTick = sec;
        if (sec <= 10 && sec > 0) this.events.push('tick');
      }
      this.updateBoat(dt, input);
      this.updateHook(dt, input);
      this.checkHook();
      this.updateCamera(dt);
      if (this.timeLeft <= 0) this.end();
    } else {
      // av bitince tekne süzülür, olta yukarı toplanır
      this.boat.vx *= 0.9;
      this.boat.tilt = Math.sin(this.T * 1.7) * 0.025;
      this.hook.y = Math.max(HOOK_TOP, this.hook.y - 300 * dt);
      this.hook.x += (this.rodTip().x - this.hook.x) * Math.min(1, dt * 6);
      this.updateCamera(dt);
    }

    this.updateFishes(dt);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      // derin bölgede daha çok balık var, aynı yoğunluk için daha sık doğsunlar
      this.spawnTimer = (this.rand(0.5, 1.1) * (14 / this.maxFish)) / this.weather.spawnRate;
      if (this.fishes.length < this.maxFish) this.spawnFish(false);
    }
    this.updateWeather(dt);
    this.updateEffects(dt);
  }

  private updateCamera(dt: number): void {
    const target = clamp(this.hook.y - this.H * 0.55, 0, Math.max(0, this.worldH - this.H));
    this.camY += (target - this.camY) * Math.min(1, dt * 4);
    if (Math.abs(this.camY - target) < 0.05) this.camY = target;
  }

  private updateBoat(dt: number, input: Input): void {
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const maxV = this.hook.fish ? 140 : 260; // balık çekerken tekne yavaşlar
    const b = this.boat;
    b.vx += (dir * maxV - b.vx) * Math.min(1, dt * 4);
    // Fırtınada rüzgâr tekneyi iter; oyuncu ters yöne sürerek dengeler.
    b.vx += this.windDir * this.weather.drift * dt;
    b.x += b.vx * dt;
    if (b.x < 90 || b.x > W - 90) {
      b.x = clamp(b.x, 90, W - 90);
      b.vx = 0;
    }
    b.tilt = clamp(-b.vx / 1800, -0.12, 0.12) + Math.sin(this.T * 1.7) * 0.025;
    if (Math.abs(b.vx) > 60 && this.rnd() < dt * 8) {
      this.ripples.push({ x: b.x - Math.sign(b.vx) * 75, r: 2, life: 0.8 });
    }
  }

  private updateHook(dt: number, input: Input): void {
    const hook = this.hook;
    const tip = this.rodTip();
    const prevY = hook.y;
    if (hook.stun > 0) hook.stun -= dt;

    let vy = 0;
    if (hook.fish) {
      // balık takıldı: olta kendiliğinden çekilir, ↑ ile hızlanır (Makara)
      vy = -140 * this.makara * hook.fish.t.reel * (input.up ? 1.6 : 1);
    } else if (hook.stun <= 0) {
      if (input.down) vy = this.inisHizi; // Kurşun
      else if (input.up) vy = -300;
    }

    hook.y = clamp(hook.y + vy * dt, HOOK_TOP, this.hookFloor());

    // derinlik arttıkça olta tekneyi daha geç takip eder
    const depthK = clamp((hook.y - SURFACE) / (this.tabanY - SURFACE), 0, 1);
    // Dalga misinayı savurur (yağmur/fırtına), derinde daha çok.
    const sway = Math.sin(this.T * 1.3) * this.weather.hookSway * depthK;
    hook.x += (tip.x + sway - hook.x) * Math.min(1, dt * (7 - 5 * depthK));

    if (prevY < SURFACE && hook.y >= SURFACE) {
      this.splashAt(hook.x, true);
      this.hookHasEntered = true;
    }
    if (prevY >= SURFACE && hook.y < SURFACE) this.splashAt(hook.x, false);

    if (hook.y > SURFACE + 10 && vy !== 0 && this.rnd() < dt * 6) {
      this.bubbles.push({ x: hook.x + this.rand(-4, 4), y: hook.y, r: this.rand(1.5, 3), v: this.rand(30, 60), w: this.rand(0, 6) });
    }

    if (hook.fish) {
      const f = hook.fish;
      f.phase += dt;
      f.x = hook.x;
      f.y = hook.y + (f.t.junk ? 20 : f.t.len * 0.5 + 2);
      if (hook.y <= HOOK_TOP + 0.5) this.landFish();
    }
  }

  /** Balık tekneye çıktı: para yerine kovaya girer. */
  private landFish(): void {
    const hook = this.hook;
    const f = hook.fish!;
    hook.fish = null;
    this.fishes.splice(this.fishes.indexOf(f), 1);
    if (f.t.species) this.catch[f.t.species] = (this.catch[f.t.species] ?? 0) + 1;

    if (f.t.junk) {
      this.popup(hook.x, hook.y - 20, f.t.name, '#ff8080');
      this.events.push('bad');
    } else if (f.t.joker) {
      this.popup(hook.x, hook.y - 20, `${f.t.name}!`, '#ffd23f', 30);
      this.sparkles(hook.x, hook.y, 24);
      this.events.push('gold');
    } else {
      this.popup(hook.x, hook.y - 20, `+ ${f.t.name}`, '#8dff9a');
      this.events.push('score');
    }
    this.flights.push({ f, x0: f.x, y0: f.y, t: 0 });
  }

  private releaseFish(): void {
    const f = this.hook.fish;
    if (!f) return;
    this.hook.fish = null;
    f.caught = false;
    f.baseY = Math.max(SURFACE + 20, f.y);
    f.phase = 0;
    f.dir = this.rnd() < 0.5 ? 1 : -1;
    f.speed = f.t.speed[1] * 1.3;
    f.cool = 1.5;
  }

  private checkHook(): void {
    const hook = this.hook;
    if (hook.y < SURFACE + 4) return;

    for (const f of this.fishes) {
      if (f.caught || f.cool > 0) continue;
      const t = f.t;

      if (t.hazard === 'shark') {
        const touchHook = this.hits(f, hook.x, hook.y, 2);
        const touchFish = hook.fish !== null && this.hits(f, hook.fish.x, hook.fish.y, 0);
        if (!touchHook && !touchFish) continue;
        f.cool = 2;
        if (hook.fish && !hook.fish.t.junk) {
          // köpekbalığı oltadaki balığı kapar
          this.fishes.splice(this.fishes.indexOf(hook.fish), 1);
          hook.fish = null;
          this.popup(hook.x, hook.y - 30, 'Köpekbalığı balığını kaptı!', '#ff6b6b');
        } else {
          // boş oltaya çarparsa misina kopar
          if (hook.fish) {
            this.fishes.splice(this.fishes.indexOf(hook.fish), 1);
            hook.fish = null;
          }
          this.timeLeft = Math.max(0, this.timeLeft - 5);
          this.popup(hook.x, hook.y - 30, 'Misina koptu! -5 sn', '#ff6b6b');
          hook.y = HOOK_TOP;
          hook.x = this.rodTip().x;
          hook.stun = 0.6;
        }
        this.events.push('bad');
        return;
      }

      if (t.hazard === 'jelly') {
        if (hook.stun <= 0 && this.hits(f, hook.x, hook.y, 4)) {
          f.cool = 2;
          hook.stun = 1.5;
          this.releaseFish();
          this.popup(hook.x, hook.y - 30, 'Denizanası çarptı!', '#ffb3e6');
          this.sparkles(hook.x, hook.y, 10, '255,180,230');
          this.events.push('zap');
          return;
        }
        continue;
      }

      if (!hook.fish && hook.stun <= 0 && this.hits(f, hook.x, hook.y, 5)) {
        hook.fish = f;
        f.caught = true;
        this.events.push('catch');
        for (let i = 0; i < 6; i++) {
          this.bubbles.push({ x: hook.x + this.rand(-8, 8), y: hook.y + this.rand(-4, 10), r: this.rand(2, 4), v: this.rand(40, 80), w: this.rand(0, 6) });
        }
        return;
      }
    }
  }

  private updateFishes(dt: number): void {
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const f = this.fishes[i];
      f.cool -= dt;
      if (f.caught) continue;
      f.phase += dt;
      f.x += f.dir * f.speed * dt;
      const jelly = f.t.hazard === 'jelly';
      f.y = f.baseY + Math.sin(f.phase * (jelly ? 1.1 : 2.2)) * (jelly ? 22 : 5);
      if (f.t.joker && this.rnd() < dt * 5) {
        this.particles.push({ x: f.x + this.rand(-15, 15), y: f.y + this.rand(-8, 8), vx: 0, vy: -20, g: 0, life: 0.6, r: 2, col: '255,230,120', star: true });
      }
      const outX = (f.dir > 0 && f.x > W + f.t.len) || (f.dir < 0 && f.x < -f.t.len);
      const farY = Math.abs(f.y - (this.camY + this.H / 2)) > this.H * 1.1;
      if (outX || farY) this.fishes.splice(i, 1);
    }
  }

  private updateWeather(dt: number): void {
    const wx = this.weather;
    if (wx.drift > 0 && !this.over) {
      this.windTimer -= dt;
      if (this.windTimer <= 0) {
        this.windDir = this.rnd() < 0.5 ? -1 : 1;
        this.windTimer = this.rand(3.5, 6.5);
      }
    }
    if (wx.lightning && this.rnd() < dt * 0.12) {
      this.flash = 1;
      this.events.push('thunder');
    }
    this.flash = Math.max(0, this.flash - dt * 2.5);

    if (wx.rain > 0) {
      const n = wx.rain * dt;
      const count = Math.floor(n) + (this.rnd() < n % 1 ? 1 : 0);
      for (let i = 0; i < count; i++) this.drops.push({ x: this.rand(-40, W + 60), y: this.rand(-20, 20), v: this.rand(650, 900) });
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.y += d.v * dt;
      d.x -= d.v * (wx.lightning ? 0.25 : 0.1) * dt;
      if (d.y >= this.waveY(d.x)) {
        if (this.rnd() < 0.08) this.ripples.push({ x: d.x, r: 1, life: 0.5 });
        this.drops.splice(i, 1);
      }
    }
  }

  private updateEffects(dt: number): void {
    for (const c of this.clouds) {
      c.x += c.v * dt;
      if (c.x > W + 80) {
        c.x = -120;
        c.y = this.rand(25, 110);
      }
    }
    for (const b of this.birds) {
      b.x += b.v * dt;
      if (b.x > W + 30) {
        b.x = -30;
        b.y = this.rand(40, 120);
      }
    }
    if (this.weeds.length > 0 && this.rnd() < dt * 3) {
      const w = this.pick(this.weeds);
      this.bubbles.push({ x: w.x, y: this.seabedY(w.x) - w.h * 0.5, r: this.rand(1.5, 3.5), v: this.rand(25, 50), w: this.rand(0, 6) });
    }
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.y -= b.v * dt;
      b.x += Math.sin(this.T * 3 + b.w) * 0.3;
      if (b.y < SURFACE + 3) this.bubbles.splice(i, 1);
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.r += 30 * dt;
      r.life -= dt * 0.9;
      if (r.life <= 0) this.ripples.splice(i, 1);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y -= 35 * dt;
      p.life -= dt;
      if (p.life <= 0) this.popups.splice(i, 1);
    }
    for (let i = this.flights.length - 1; i >= 0; i--) {
      this.flights[i].t += dt * 1.8;
      if (this.flights[i].t >= 1) this.flights.splice(i, 1);
    }
  }
}
