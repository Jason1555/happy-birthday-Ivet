import type { Tool } from '../types';

/**
 * Тихий синтезированный звук: выдох при задувании свечи, шорох кисти/угля
 * (громче, когда инструмент касается холста) и аккорд в финале.
 * AudioContext создаётся только после действия пользователя.
 */
export class SoftAudio {
  private ctx: AudioContext | null = null;
  private brushGain: GainNode | null = null;
  private brushFilter: BiquadFilterNode | null = null;
  private noise: AudioBufferSourceNode | null = null;
  private lastKey = '';
  muted = false;

  private ensure() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Разбудить звук прямо в обработчике клика — иначе браузер его заблокирует. */
  unlock() { if (!this.muted) this.ensure(); }

  setMuted(value: boolean) { this.muted = value; if (value) this.stopBrush(); }

  blow() {
    if (this.muted) return;
    const ctx = this.ensure(), now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.9);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.8);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.9);
  }

  startBrush() {
    if (this.muted || this.noise) return;
    const ctx = this.ensure();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      brown = (brown + (Math.random() * 2 - 1) * 0.08) * 0.985;
      data[i] = brown * 2.2 + (Math.random() * 2 - 1) * 0.12;
    }
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buffer; src.loop = true;
    filter.type = 'bandpass'; filter.frequency.value = 1200; filter.Q.value = 0.8;
    gain.gain.value = 0.0001;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    this.noise = src; this.brushGain = gain; this.brushFilter = filter; this.lastKey = '';
  }

  /** Уголь шуршит выше и суше, флейц — глухо, мягкие кисти — между ними. */
  setBrush(pressing: boolean, tool: Tool) {
    if (!this.ctx || !this.brushGain || !this.brushFilter) return;
    const key = `${pressing}-${tool}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const now = this.ctx.currentTime;
    const freq = tool === 'charcoal' ? 3200 : tool === 'wash' ? 700 : tool === 'flat' ? 1100 : 1600;
    const level = !pressing ? 0.0015 : tool === 'charcoal' ? 0.05 : tool === 'wash' ? 0.06 : 0.035;
    this.brushFilter.frequency.setTargetAtTime(freq, now, 0.05);
    this.brushGain.gain.setTargetAtTime(level, now, pressing ? 0.03 : 0.06);
  }

  stopBrush() {
    if (this.brushGain && this.ctx) this.brushGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
    const n = this.noise;
    if (n) setTimeout(() => { try { n.stop(); } catch { /* уже остановлен */ } }, 250);
    this.noise = null; this.brushGain = null; this.brushFilter = null;
  }

  finish() {
    this.stopBrush();
    if (this.muted) return;
    const ctx = this.ensure(); const now = ctx.currentTime;
    // Ми-бемоль мажор, арпеджио — тёплее, чем чистое до.
    [311.13, 392.0, 466.16, 622.25].forEach((freq, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = freq;
      const t = now + i * 0.11;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 1.7);
    });
  }
}
