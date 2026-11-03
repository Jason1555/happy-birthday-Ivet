import type { Point } from '../types';

/**
 * Физика руки: кисть не телепортируется к точке мазка, а догоняет её с
 * инерцией. Наклон зависит от скорости по горизонтали, при отрыве от холста
 * кисть «приподнимается».
 */
export class BrushMotion {
  x = 0;
  y = 0;
  tilt = 0;
  private vx = 0;
  private initialized = false;

  update(target: Point, dtMs: number, lag = 55) {
    if (!this.initialized) { this.x = target.x; this.y = target.y; this.initialized = true; return; }
    const k = 1 - Math.exp(-dtMs / lag);
    const nx = this.x + (target.x - this.x) * k;
    const ny = this.y + (target.y - this.y) * k;
    const vx = (nx - this.x) / Math.max(1, dtMs);
    this.vx += (vx - this.vx) * 0.2;
    this.x = nx; this.y = ny;
    const wanted = Math.max(-14, Math.min(14, this.vx * 26));
    this.tilt += (wanted - this.tilt) * 0.15;
  }
}

/** Путь кисти на палитру и обратно: подлёт, пара круговых движений в краске, возврат к холсту. */
export function paletteTrip(t: number, from: Point, blob: Point, to: Point, radius: number): { p: Point; pressing: boolean } {
  const smooth = (q: number) => q * q * (3 - 2 * q);
  const arc = (a: Point, b: Point, q: number, lift: number) => {
    const e = smooth(q);
    return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e - Math.sin(Math.PI * e) * lift };
  };
  if (t < 0.38) return { p: arc(from, blob, t / 0.38, 60), pressing: false };
  if (t < 0.66) {
    const q = (t - 0.38) / 0.28;
    const ang = q * Math.PI * 4;
    const r = radius * Math.sin(Math.PI * q);
    return { p: { x: blob.x + Math.cos(ang) * r, y: blob.y + Math.sin(ang) * r * 0.6 }, pressing: true };
  }
  return { p: arc(blob, to, (t - 0.66) / 0.34, 70), pressing: false };
}
