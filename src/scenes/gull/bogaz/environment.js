// DALYAN: Boğaz oyunundan (Oyun/bogaz/src) değiştirilmeden kopyalandı.
import { WORLD, TIDE, WIND, PHASES, PHASE_EVERY, PHASE_BLEND } from './config.js';

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Paletleri bir kez RGB dizilerine çevir; geçişlerde her karede lerp edilir.
const PALETTES = PHASES.map((p) => {
  const o = {};
  for (const k in p) o[k] = typeof p[k] === 'string' && p[k][0] === '#' ? hexToRgb(p[k]) : p[k];
  return o;
});

function mix(a, b, t) {
  const o = {};
  for (const k in b) {
    const va = a[k];
    const vb = b[k];
    if (Array.isArray(vb)) o[k] = vb.map((v, i) => va[i] + (v - va[i]) * t);
    else if (typeof vb === 'number') o[k] = va + (vb - va) * t;
    else o[k] = vb;
  }
  return o;
}

export function rgb(c, a = 1) {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}

export function difficulty(score) {
  return Math.min(1, score / WORLD.rampScore);
}

export class Environment {
  constructor() {
    this.onPhase = null;
    this.onWind = null;
    this.reset();
  }

  reset() {
    this.t = 0;
    this.tidePhase = 0;
    this.amp = TIDE.ampMin;
    this.level = WORLD.waterBase;
    this.phaseIndex = 0;
    this.phaseLock = null;
    this.from = PALETTES[0];
    this.pal = PALETTES[0];
    this.blend = 1;
    this.wind = { state: 'idle', timer: this.nextWindGap(), dir: 0, time: 0 };
  }

  get phase() {
    return PHASES[this.phaseIndex];
  }

  nextWindGap() {
    const rate = this.pal ? this.pal.windRate : 1;
    return (WIND.gapMin + Math.random() * (WIND.gapMax - WIND.gapMin)) / rate;
  }

  update(dt, score, playing) {
    this.t += dt;
    this.amp = TIDE.ampMin + (TIDE.ampMax - TIDE.ampMin) * difficulty(score);
    this.tidePhase += (dt * 2 * Math.PI / TIDE.period) * this.pal.tideSpeed;
    this.level = WORLD.waterBase + this.amp * Math.sin(this.tidePhase);

    const idx = this.phaseLock ?? Math.floor(score / PHASE_EVERY) % PHASES.length;
    if (idx !== this.phaseIndex) this.changePhase(idx);
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / PHASE_BLEND);
      this.pal = mix(this.from, PALETTES[this.phaseIndex], this.blend);
    }

    if (playing) this.updateWind(dt);
    else this.wind.state = 'idle';
  }

  changePhase(idx) {
    this.from = this.pal;
    this.phaseIndex = idx;
    this.blend = 0;
    if (this.onPhase) this.onPhase(PHASES[idx]);
  }

  // Hata ayıklama: evreyi skordan bağımsız sabitle (null ile kilidi kaldır).
  setPhase(idx) {
    this.phaseLock = idx === null ? null : ((idx % PHASES.length) + PHASES.length) % PHASES.length;
  }

  updateWind(dt) {
    const w = this.wind;
    if (w.state === 'idle') {
      w.timer -= dt;
      if (w.timer <= 0) this.triggerWind();
    } else if (w.state === 'warn') {
      w.time -= dt;
      if (w.time <= 0) {
        w.state = 'blow';
        w.time = WIND.duration;
      }
    } else if (w.state === 'blow') {
      w.time -= dt;
      if (w.time <= 0) {
        w.state = 'idle';
        w.timer = this.nextWindGap();
      }
    }
  }

  triggerWind(dir = Math.random() < 0.5 ? -1 : 1) {
    this.wind.state = 'warn';
    this.wind.time = WIND.warn;
    this.wind.dir = dir;
    if (this.onWind) this.onWind(dir);
  }

  // Poyraz sadece havadaki karaktere uygulanır; player.js bunu yalnızca havadayken ekler.
  windForce() {
    return this.wind.state === 'blow' ? this.wind.dir * WIND.force : 0;
  }

  waterY(x) {
    const a = this.pal.wave;
    return this.level
      + Math.sin(x * 0.035 + this.t * 2.2) * a
      + Math.sin(x * 0.09 - this.t * 3.1) * a * 0.35;
  }
}
