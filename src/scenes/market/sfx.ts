/** Tüm sesler WebAudio ile üretilir; ses dosyası yok. (neon-rezonans'tan uyarlandı) */
const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0]; // tür başına pentatonik nota

export class Sfx {
  enabled = true;
  private ctx: AudioContext | null = null;

  resume(): void {
    if (!this.enabled) return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  dispose(): void {
    void this.ctx?.close();
    this.ctx = null;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.13, delay = 0, slide = 0): void {
    if (!this.enabled) return;
    this.resume();
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  place(): void {
    this.tone(170, 0.09, 'triangle', 0.16, 0, -60);
  }

  rotate(): void {
    this.tone(520, 0.07, 'square', 0.05, 0, 180);
  }

  invalid(): void {
    this.tone(120, 0.12, 'sawtooth', 0.06, 0, -30);
  }

  lineClear(combo: number): void {
    const base = 620 * Math.pow(1.09, Math.min(8, combo));
    this.tone(base, 0.16, 'triangle', 0.12);
    this.tone(base * 1.5, 0.2, 'sine', 0.09, 0.05);
  }

  wholesale(speciesIndex: number, big: boolean): void {
    const n = NOTES[speciesIndex % NOTES.length];
    this.tone(n, 0.3, 'sine', 0.16);
    this.tone(n * 1.5, 0.35, 'triangle', 0.1, 0.06);
    if (big) {
      this.tone(n * 2, 0.5, 'sine', 0.14, 0.12);
      this.tone(n * 3, 0.5, 'sine', 0.07, 0.18);
    }
  }

  coin(): void {
    this.tone(1320, 0.08, 'square', 0.04);
    this.tone(1760, 0.12, 'square', 0.035, 0.05);
  }

  charge(): void {
    this.tone(440, 0.12, 'sine', 0.1);
    this.tone(660, 0.18, 'sine', 0.1, 0.08);
    this.tone(880, 0.24, 'sine', 0.09, 0.16);
  }

  power(): void {
    this.tone(760, 0.12, 'square', 0.07, 0, -300);
  }

  close(): void {
    this.tone(523.25, 0.2, 'triangle', 0.12);
    this.tone(659.25, 0.2, 'triangle', 0.12, 0.14);
    this.tone(783.99, 0.45, 'sine', 0.12, 0.28);
  }
}
