import { CHARACTERS, H, W, WORLD } from './bogaz/config.js';
import { Environment, difficulty } from './bogaz/environment.js';
import { Player } from './bogaz/player.js';
import { Obstacles } from './bogaz/obstacles.js';
import { Particles, World } from './bogaz/world.js';
import { drawCatchable, type GradientCache } from '../fishing/fishart';
import { FISH_SCALE, School, type WaterEnv } from './school';
import { SPECIES } from '../../app/species';

export { H, W };
export const STEP = 1 / 120;

export interface GullOptions {
  /** Su altında kalma süresi (sn). */
  nefes: number;
  /** İnilebilen derinlik (px). */
  dalis: number;
  /** Gaga menzili (px). */
  gaga: number;
  /** Çarpışmayı affeden can simidi sayısı. */
  simit: number;
}

export type GullSound = 'flap' | 'dive' | 'splash' | 'score' | 'collect' | 'hit' | 'wind' | 'horn' | 'catch' | 'junk';

interface Toast {
  msg: string;
  color: string;
  t: number;
  dur: number;
}

const HIT_TEXT: Record<string, string> = {
  column: 'İskeleye çarptın!',
  ferry: 'Vapura çarptın!',
  flock: 'Rakip martıya çarptın!',
  jelly: 'Denizanası çarptı!',
  lowBridge: 'Köprüye çarptın!',
  galata: 'Oltaya takıldın!',
};

const PHASE_ICON: Record<string, string> = { sabah: '☀️', gunbatimi: '🌇', gece: '🌙', firtina: '⛈️' };

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Boğaz koşusunun martı hâli (Oyun/bogaz/src/main.js'ten uyarlandı):
 * can yok, skor = geçilen engel; suya dalıp gagayla balık tutulur.
 */
export class GullGame {
  state: 'ready' | 'play' | 'over' = 'ready';
  readonly env = new Environment();
  readonly world = new World();
  readonly particles = new Particles();
  readonly obstacles = new Obstacles();
  readonly player: Player;
  readonly school: School;
  score = 0;
  time = 0;
  overT = 0;
  shake = 0;
  simits: number;
  deathReason = '';
  toasts: Toast[] = [];
  sounds: GullSound[] = [];
  private grads: GradientCache = new Map();
  /** Boğaz ortamının su arayüzü (JS sınıfının tipleri gevşek çıkarılıyor). */
  private readonly water = this.env as unknown as WaterEnv;

  constructor(readonly o: GullOptions) {
    const cfg = { ...CHARACTERS.marti, outsideLimit: o.nefes };
    this.player = new Player(cfg, o.dalis);
    this.obstacles.reset(cfg);
    this.school = new School({ dive: o.dalis, beak: o.gaga });
    this.simits = o.simit;

    this.env.onPhase = (ph: { id: string; name: string }) => {
      if (this.state === 'play') this.toast(`${PHASE_ICON[ph.id] ?? ''} ${ph.name}`, '#fef3c7');
    };
    this.env.onWind = () => this.sounds.push('wind');
    this.obstacles.onSpawn = (type: string) => {
      if (type === 'ferry') this.sounds.push('horn');
    };
  }

  toast(msg: string, color = '#fff'): void {
    this.toasts.push({ msg, color, t: 0, dur: 1.6 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  private fx = {
    splash: (x: number, y: number, strength: number) => {
      this.particles.splash(x, y, strength);
      this.sounds.push('splash');
    },
    bubble: (x: number, y: number) => this.particles.bubble(x, y),
    dive: () => this.sounds.push('dive'),
  };

  // ---------- Girdi: dokun = yukarı, basılı tut = dal ----------
  press(diveOnly = false): void {
    if (this.state === 'over') return;
    if (this.state === 'ready') this.state = 'play';
    if (diveOnly) this.player.pressDive();
    else {
      this.player.press();
      this.sounds.push('flap');
    }
  }

  release(): void {
    this.player.release();
  }

  private speed(): number {
    return lerp(WORLD.speedMin, WORLD.speedMax, difficulty(this.score));
  }

  update(dt: number): void {
    this.time += dt;
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter((t) => t.t < t.dur);

    const playing = this.state === 'play';
    this.env.update(dt, this.score, playing);
    const speed = this.state === 'ready' ? 60 : this.state === 'play' ? this.speed() : 0;
    this.world.update(dt, speed, this.env, this.particles);
    this.particles.update(dt, this.env, speed);
    this.school.update(dt, speed, this.state !== 'over');

    if (this.state === 'ready') {
      this.player.hover(dt, this.env);
      return;
    }
    if (this.state === 'over') {
      this.overT += dt;
      this.shake = Math.max(0, this.shake - dt);
      return;
    }

    const p = this.player;
    p.update(dt, this.env, this.fx);
    this.obstacles.update(dt, speed, this.env, this.score);

    const passed = this.obstacles.countPassed(p.x);
    if (passed) {
      this.score += passed;
      this.sounds.push('score');
    }

    for (const it of this.obstacles.collect(p, this.env)) {
      if (it) {
        p.invuln = WORLD.invuln;
        this.sounds.push('collect');
        this.toast('Simit! Kısa süre dokunulmazsın 🥯', '#ffd166');
      }
    }

    // Gaga başın önünde; su yüzeyine yakın ya da içindeyken balık kapılabilir.
    if (p.depth > -10) {
      const beakX = p.x + 16;
      const fish = this.school.tryCatch(beakX, p.y, this.water);
      if (fish) {
        const s = SPECIES[fish.sp];
        this.sounds.push(s.junk ? 'junk' : 'catch');
        this.toast(s.junk ? `${s.name} 🙄` : `+ ${s.name}`, s.junk ? '#ffb4b4' : '#bbf7d0');
        for (let i = 0; i < 6; i++) this.particles.bubble(fish.x, p.y);
      }
    }

    let reason: string | null = p.deathReason();
    if (!reason && p.invuln <= 0) {
      const hit = this.obstacles.collides(p, this.env);
      if (hit) {
        if (this.simits > 0) {
          this.simits--;
          p.invuln = WORLD.invuln;
          this.sounds.push('collect');
          this.toast('Can simidi seni kurtardı! 🛟', '#fde68a');
        } else {
          reason = HIT_TEXT[hit] ?? 'Çarptın!';
        }
      }
    }
    if (reason) this.die(reason);
  }

  private die(reason: string): void {
    this.state = 'over';
    this.overT = 0;
    this.shake = 0.35;
    this.deathReason = reason;
    this.player.release();
    this.sounds.push('hit');
  }

  /** Oyun dünyasını çizer (HUD ayrı). `k`: mantıksal birim → aygıt pikseli. */
  render(ctx: CanvasRenderingContext2D, k: number): void {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.save();
    if (this.shake > 0) {
      const s = this.shake * 18;
      ctx.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
    }
    this.world.drawBack(ctx, this.env);
    this.drawSchool(ctx);
    this.obstacles.draw(ctx, this.env);
    this.player.draw(ctx);
    this.world.drawFront(ctx, this.env);
    this.particles.draw(ctx);
    ctx.restore();
    this.world.drawDark(ctx, this.env, this.player);
    ctx.setTransform(k, 0, 0, k, 0, 0);
  }

  private drawSchool(ctx: CanvasRenderingContext2D): void {
    for (const f of this.school.fish) {
      const reachable = this.school.reachable(f);
      ctx.save();
      ctx.translate(f.x, this.school.y(f, this.water));
      ctx.scale(FISH_SCALE, FISH_SCALE);
      // Dalışın yetmediği balıklar soluk görünür: yükseltme hedefi.
      if (!reachable) ctx.globalAlpha = 0.45;
      drawCatchable(ctx, f.t, f, 0, this.grads);
      ctx.restore();
    }
  }
}
