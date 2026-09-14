// DALYAN: Boğaz oyunundan kopyalandı; dalış sınırı eklendi.
import { WORLD } from './config.js';
import { drawCharacter } from './characters.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Havada yaşayan karakter bu derinliğe kadar yüzeyde süzülebilir, nefesi azalmaz.
const FLOAT_DEPTH = 8;
// Bundan uzun basılı tutmak dalış demek; daha kısası sadece dokunuştur.
const HOLD_DELAY = 0.12;

// Kontrol iki karakter için de aynı: dokun = yukarı, basılı tut = dal.
// Balık derine dalıp bırakınca kaldırma kuvvetiyle sudan fırlar; Martı pike yapıp suya dalar.
export class Player {
  // diveCap: su yüzeyinin altına en fazla inilebilecek derinlik (px). DALYAN'da Dalış yükseltmesi.
  constructor(cfg, diveCap = Infinity) {
    this.cfg = cfg;
    this.diveCap = diveCap;
    this.r = cfg.radius;
    this.x = WORLD.playerX;
    this.y = WORLD.waterBase;
    this.vy = 0;
    this.depth = 0;
    this.breath = 1;
    this.invuln = 0;
    this.inWater = false;
    this.angle = 0;
    this.flap = 0;
    this.t = 0;
    this.bubbleT = 0;
    this.holding = false;
    this.holdT = 0;
    this.diving = false;
  }

  // Karakter kendi ortamının dışında mı? (nefes barı buna göre azalır)
  get outside() {
    return this.cfg.home === 'water' ? !this.inWater : this.depth > FLOAT_DEPTH;
  }

  press() {
    this.holding = true;
    this.holdT = 0;
    this.tap();
  }

  // Klavyede aşağı ok: yukarı çırpmadan doğrudan dal.
  pressDive() {
    this.holding = true;
    this.holdT = HOLD_DELAY;
  }

  release() {
    this.holding = false;
  }

  tap() {
    if (this.inWater) {
      // Suda yukarı kulaç: zaten yükseliyorsa hızın bir kısmı korunur, sudan fırlamak kolaylaşır.
      this.vy = Math.min(this.vy, 0) * 0.5 + this.cfg.water.tap;
    } else {
      this.vy = this.cfg.air.tap;
    }
    this.flap = 1;
  }

  // Oyun başlamadan önceki "hazır" bekleyişinde yerinde süzülme.
  hover(dt, env) {
    this.t += dt;
    const surface = env.waterY(this.x);
    const base = this.cfg.home === 'water' ? surface + 5 : surface - 110;
    this.y = base + Math.sin(this.t * 3) * 5;
    this.vy = 0;
    this.depth = this.y - surface;
    this.inWater = this.depth > 0;
    this.angle *= 0.9;
  }

  update(dt, env, fx) {
    const cfg = this.cfg;
    this.t += dt;
    this.flap = Math.max(0, this.flap - dt * 3);
    this.invuln = Math.max(0, this.invuln - dt);

    if (this.holding) this.holdT += dt;
    const diving = this.holding && this.holdT >= HOLD_DELAY;
    if (diving && !this.diving) {
      this.vy = Math.max(this.vy, 0);
      fx.dive();
    }
    this.diving = diving;

    const surface = env.waterY(this.x);
    const was = this.inWater;
    if (this.y > surface) {
      const w = cfg.water;
      const depth = this.y - surface;
      // Yüzeye yakın kaldırma zayıflar, böylece karakter yüzeyde titremeden salınır.
      const atCap = depth >= this.diveCap;
      this.vy += (w.buoyancy * Math.min(1, depth / 16) + (diving && !atCap ? w.dive : 0)) * dt;
      this.vy -= this.vy * w.drag * dt;
      this.vy = Math.min(this.vy, w.maxFall);
    } else {
      this.vy += (cfg.air.gravity + (diving ? cfg.air.dive : 0) + env.windForce()) * dt;
    }
    this.vy = clamp(this.vy, WORLD.maxRise, WORLD.maxFall);
    this.y += this.vy * dt;

    // Dalış sınırı: bu derinlikten aşağı inemez.
    const capY = env.waterY(this.x) + this.diveCap;
    if (this.y > capY) {
      this.y = capY;
      if (this.vy > 0) this.vy = 0;
    }

    this.depth = this.y - env.waterY(this.x);
    const inWater = this.depth > 0;
    if (inWater && !was) {
      if (this.vy > 90) fx.splash(this.x, surface, this.vy);
      this.vy *= cfg.splashDamp ?? WORLD.splashDamp;
    } else if (!inWater && was && this.vy < -150) {
      fx.splash(this.x, surface, -this.vy * 0.6);
    }
    this.inWater = inWater;

    if (this.outside) this.breath -= dt / cfg.outsideLimit;
    else this.breath = Math.min(1, this.breath + dt * 1.6);

    if (this.inWater) {
      this.bubbleT -= dt;
      if (this.bubbleT <= 0) {
        fx.bubble(this.x - 12, this.y);
        this.bubbleT = 0.12 + Math.random() * 0.15;
      }
    }

    const target = clamp(this.vy / 650, -0.6, 0.9);
    this.angle += (target - this.angle) * Math.min(1, dt * 10);
  }

  deathReason() {
    if (this.breath <= 0) return this.cfg.deathOutside;
    if (this.y - this.r < 0) return 'Çok yükseğe çıktın!';
    if (this.y + this.r > WORLD.seabed) return 'Dibe vurdun!';
    return null;
  }

  draw(ctx) {
    drawCharacter(ctx, this.cfg.id, this.x, this.y, this.angle, {
      inWater: this.inWater,
      dive: this.diving,
      flap: this.flap,
      t: this.t,
      invuln: this.invuln,
    });
  }
}
