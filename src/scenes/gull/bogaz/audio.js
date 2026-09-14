// DALYAN: Boğaz oyunundan kopyalandı; sessiz ayarı profilden gelir.
// Ses dosyası yok: tüm efektler WebAudio ile anında sentezlenir.
// iOS ve Chrome, sesin ancak bir kullanıcı dokunuşundan sonra açılmasına izin verir.
export class Sound {
  constructor(enabled = true) {
    this.ctx = null;
    this.muted = !enabled;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  dispose() {
    if (this.ctx) this.ctx.close();
    this.ctx = null;
  }

  get ready() {
    return this.ctx && !this.muted && this.ctx.state === 'running';
  }

  tone(freq, dur, { type = 'sine', vol = 0.1, slide = null, delay = 0 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur, { vol = 0.15, freq = 1200, q = 0.8, delay = 0 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
  }

  flap()    { this.tone(520, 0.08, { type: 'square', vol: 0.04, slide: 760 }); }
  dive()    { this.tone(340, 0.14, { type: 'sine', vol: 0.09, slide: 150 }); }
  splash()  { this.noise(0.28, { vol: 0.18, freq: 900 }); }
  score()   { this.tone(880, 0.06, { type: 'triangle', vol: 0.05 }); }
  collect() {
    [660, 880, 1320].forEach((f, i) => this.tone(f, 0.09, { type: 'triangle', vol: 0.07, delay: i * 0.06 }));
  }
  heart() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, { type: 'sine', vol: 0.09, delay: i * 0.08 }));
  }
  hit() {
    this.noise(0.35, { vol: 0.25, freq: 400 });
    this.tone(180, 0.35, { type: 'sawtooth', vol: 0.08, slide: 60 });
  }
  wind()    { this.noise(1.6, { vol: 0.12, freq: 500, q: 0.5 }); }
  horn() {
    this.tone(155, 0.7, { type: 'sawtooth', vol: 0.03 });
    this.tone(233, 0.7, { type: 'sawtooth', vol: 0.02 });
  }
  denied()  { this.tone(200, 0.15, { type: 'square', vol: 0.05, slide: 140 }); }
  catchFish() {
    this.tone(700, 0.07, { type: 'triangle', vol: 0.08 });
    this.tone(1050, 0.12, { type: 'triangle', vol: 0.08, delay: 0.06 });
  }
  junk()    { this.tone(240, 0.3, { type: 'sawtooth', vol: 0.06, slide: 100 }); }
}
