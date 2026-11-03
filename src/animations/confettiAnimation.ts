import { seeded } from '../utils/canvasUtils';

/*
 * Финал: лепестки роз и бумажное конфетти в гамме открытки.
 * Лепестки планируют и переворачиваются (сжатие по одной оси имитирует 3D),
 * конфетти сначала выстреливает из-за краёв, потом медленно оседает.
 */

const PETALS = ['#7a1a2e', '#93263c', '#a8384d', '#c25b6c', '#6a1426'];
const PAPER = ['#efe3d0', '#c9a46a', '#a8384d', '#e7c6c0', '#5e1624'];

type Petal = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; flip: number; vf: number; size: number; color: string; depth: number; sway: number };
type Bit = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; flip: number; vf: number; w: number; h: number; color: string };

export class CelebrationEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private petals: Petal[] = [];
  private bits: Bit[] = [];
  private raf = 0;
  private running = false;
  private last = 0;
  private born = 0;
  private amount: number;
  private rng = seeded(1909);

  constructor(canvas: HTMLCanvasElement, amount: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.amount = amount;
    this.resize();
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    this.canvas.width = Math.floor(innerWidth * dpr);
    this.canvas.height = Math.floor(innerHeight * dpr);
    this.canvas.style.width = `${innerWidth}px`;
    this.canvas.style.height = `${innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private petal(initial: boolean): Petal {
    const r = this.rng;
    const depth = 0.4 + r() * 0.6;
    return {
      x: r() * innerWidth, y: initial ? -r() * innerHeight * 0.9 - 20 : -30,
      vx: (r() - 0.3) * 0.5, vy: 0.5 + r() * 0.7 * depth,
      rot: r() * Math.PI * 2, vr: (r() - 0.5) * 0.03,
      flip: r() * Math.PI * 2, vf: 0.02 + r() * 0.04,
      size: (9 + r() * 9) * depth, color: PETALS[Math.floor(r() * PETALS.length)], depth, sway: r() * 10
    };
  }

  private burst() {
    const r = this.rng;
    const n = Math.round(this.amount * 0.7);
    for (let i = 0; i < n; i++) {
      const fromLeft = i % 2 === 0;
      const angle = (fromLeft ? -0.95 : -Math.PI + 0.95) + (r() - 0.5) * 0.6;
      const speed = 9 + r() * 9;
      this.bits.push({
        x: fromLeft ? -10 : innerWidth + 10, y: innerHeight * (0.55 + r() * 0.35),
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        rot: r() * 6, vr: (r() - 0.5) * 0.3, flip: r() * 6, vf: 0.1 + r() * 0.2,
        w: 5 + r() * 6, h: 3 + r() * 4, color: PAPER[Math.floor(r() * PAPER.length)]
      });
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.petals = [];
    this.bits = [];
    const n = Math.max(30, Math.round(this.amount * 0.45));
    for (let i = 0; i < n; i++) this.petals.push(this.petal(true));
    this.burst();
    this.last = this.born = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.ctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  private frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(2.2, (now - this.last) / 16.67);
    this.last = now;
    this.update(dt, now);
    this.render();
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number, now: number) {
    const age = (now - this.born) / 1000;
    for (const p of this.petals) {
      p.flip += p.vf * dt;
      p.rot += p.vr * dt;
      // Лепесток тормозит, когда разворачивается плашмя к воздуху.
      const drag = 0.55 + 0.45 * Math.abs(Math.cos(p.flip));
      p.x += (p.vx + Math.sin(now * 0.0011 + p.sway) * 0.6 * p.depth) * dt;
      p.y += p.vy * drag * dt;
      // После первой волны лепестки идут реже.
      if (p.y > innerHeight + 30) Object.assign(p, age < 9 ? this.petal(false) : { y: innerHeight + 9999, vy: 0 });
    }
    for (const b of this.bits) {
      b.vx *= Math.pow(0.95, dt);
      b.vy = b.vy * Math.pow(0.95, dt) + 0.22 * dt;
      b.vy = Math.min(b.vy, 2.2);
      b.x += b.vx * dt + Math.sin(b.flip) * 0.4;
      b.y += b.vy * dt;
      b.rot += b.vr * dt;
      b.flip += b.vf * dt;
    }
    this.bits = this.bits.filter((b) => b.y < innerHeight + 20);
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of this.petals) {
      if (p.y > innerHeight + 40) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.25 + 0.75 * Math.abs(Math.cos(p.flip)));
      const s = p.size;
      ctx.globalAlpha = 0.65 + p.depth * 0.35;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.55);
      ctx.bezierCurveTo(-s * 0.75, s * 0.2, -s * 0.6, -s * 0.55, -s * 0.12, -s * 0.5);
      ctx.quadraticCurveTo(0, -s * 0.38, s * 0.12, -s * 0.5);
      ctx.bezierCurveTo(s * 0.6, -s * 0.55, s * 0.75, s * 0.2, 0, s * 0.55);
      ctx.fill();
      // Прожилка и светлое основание лепестка.
      ctx.globalAlpha *= 0.35;
      ctx.strokeStyle = '#f3c9cf';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.45);
      ctx.quadraticCurveTo(s * 0.06, 0, 0, -s * 0.3);
      ctx.stroke();
      ctx.restore();
    }
    for (const b of this.bits) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.scale(Math.cos(b.flip), 1);
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
  }
}
