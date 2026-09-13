import type { FishingEvent } from './world';

/** Balık Avı'nın WebAudio efektleri (BalikAvi/js/ses.js). Ses dosyası yok. */
export class FishingSfx {
  enabled = true;
  private ctx: AudioContext | null = null;

  resume(): void {
    if (!this.enabled) return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor();
      } catch {
        this.ctx = null;
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  dispose(): void {
    void this.ctx?.close();
    this.ctx = null;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slideTo: number | null = null, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private splash(): void {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const len = 0.3;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.value = 0.25;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start();
  }

  play(e: FishingEvent): void {
    switch (e) {
      case 'splash':
        this.splash();
        break;
      case 'catch':
        this.tone(500, 0.1, 'triangle', 0.15);
        this.tone(750, 0.15, 'triangle', 0.15, null, 0.08);
        break;
      case 'score':
        this.tone(660, 0.08, 'square', 0.06);
        this.tone(880, 0.08, 'square', 0.06, null, 0.07);
        this.tone(1320, 0.18, 'square', 0.06, null, 0.14);
        break;
      case 'gold':
        [660, 880, 1100, 1320, 1760].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.12, null, i * 0.07));
        break;
      case 'bad':
        this.tone(240, 0.35, 'sawtooth', 0.08, 90);
        break;
      case 'zap':
        this.tone(900, 0.25, 'square', 0.06, 200);
        break;
      case 'tick':
        this.tone(1200, 0.04, 'square', 0.05);
        break;
      case 'start':
        this.tone(440, 0.1, 'triangle', 0.12);
        this.tone(660, 0.15, 'triangle', 0.12, null, 0.1);
        break;
      case 'end':
        [784, 659, 523, 392].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.12, null, i * 0.15));
        break;
    }
  }
}
