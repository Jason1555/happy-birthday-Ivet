import { seeded } from '../utils/canvasUtils';
import type { Point, PortraitPlan, RGB, Stroke, Tool } from '../types';

/*
 * Рендерер живописи.
 *
 * Холст не перерисовывается каждый кадр: мазки кладутся инкрементально, ровно
 * на тот кусок пути, который кисть прошла с прошлого кадра. Каждый мазок —
 * пучок «щетинок» со своим оттенком, прозрачностью, началом и концом: так
 * получаются рваные сухие концы, сужение у круглых кистей и прямые края у
 * плоских. Набросок рисуется углём через зернистый паттерн.
 */

export type BrushFrame =
  | { mode: 'canvas'; x: number; y: number; pressing: boolean; tool: Tool; color: string }
  | { mode: 'palette'; t: number; from: Point; to: Point; tool: Tool; color: string; paintIndex: number };

export type PaintFrame = {
  brush: BrushFrame | null;
  phaseIndex: number;
  strokesDone: number;
  done: boolean;
};

type Bristle = { off: number; w: number; color: string; alpha: number; from: number; to: number };
type Prepared = { normals: Point[]; bristles: Bristle[] };

const PALETTE_TRIP_MS = 1100;
const LINEN = '#e7dccb';

const css = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const clamp255 = (v: number) => Math.max(0, Math.min(255, v));

function makeGrain(ctx: CanvasRenderingContext2D, color: RGB) {
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d')!;
  const img = g.createImageData(96, 96);
  const rnd = seeded(77);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rnd();
    img.data[i] = color[0]; img.data[i + 1] = color[1]; img.data[i + 2] = color[2];
    // Уголь цепляется за верхушки нитей: часть пикселей пустая.
    img.data[i + 3] = v < 0.22 ? 0 : 140 + v * 115;
  }
  g.putImageData(img, 0, 0);
  return ctx.createPattern(c, 'repeat')!;
}

function toolShape(tool: Tool, width: number) {
  switch (tool) {
    case 'wash': return { n: 18, wMul: 2.1, head: 0.05, tail: 0.22, taper: 0 };
    case 'flat': return { n: Math.max(6, Math.min(18, Math.round(width / 3))), wMul: 1.9, head: 0.03, tail: 0.28, taper: 0.1 };
    case 'filbert': return { n: Math.max(5, Math.min(14, Math.round(width / 3))), wMul: 1.75, head: 0.05, tail: 0.18, taper: 0.55 };
    case 'round': return { n: Math.max(3, Math.min(8, Math.round(width / 2.4))), wMul: 1.6, head: 0.04, tail: 0.12, taper: 0.8 };
    case 'rigger': return { n: 2, wMul: 1.2, head: 0, tail: 0.1, taper: 0.4 };
    default: return { n: 1, wMul: 1, head: 0, tail: 0, taper: 0 };
  }
}

function prepare(stroke: Stroke): Prepared {
  const pts = stroke.points;
  const normals: Point[] = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy) || 1;
    return { x: -dy / n, y: dx / n };
  });
  const rnd = seeded(Math.floor(stroke.seed * 1e9) + 1);
  const shape = toolShape(stroke.tool, stroke.width);
  const bristles: Bristle[] = [];
  for (let i = 0; i < shape.n; i++) {
    const off = -0.5 + (i + 0.5) / shape.n + (rnd() - 0.5) * (0.5 / shape.n);
    const edge = off * off * 4; // 0 в центре, 1 по краям
    const light = stroke.tool === 'wash' ? 1 + (rnd() - 0.5) * 0.25 : 1 + (rnd() - 0.5) * 0.16;
    const warm = (rnd() - 0.5) * 10;
    const c: RGB = [clamp255(stroke.color[0] * light + warm), clamp255(stroke.color[1] * light), clamp255(stroke.color[2] * light - warm)];
    bristles.push({
      off,
      w: (stroke.width / shape.n) * shape.wMul * (0.75 + rnd() * 0.5),
      color: css(c),
      alpha: stroke.alpha * (0.5 + rnd() * 0.45),
      from: shape.head * rnd() + shape.taper * 0.22 * edge,
      to: 1 - shape.tail * rnd() - shape.taper * 0.35 * edge
    });
  }
  return { normals, bristles };
}

/** Точка на пути мазка по длине дуги. */
function pointAt(stroke: Stroke, l: number): { p: Point; i: number } {
  const { points, cum } = stroke;
  if (l <= 0) return { p: points[0], i: 0 };
  if (l >= stroke.length) return { p: points[points.length - 1], i: points.length - 1 };
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= l) lo = mid; else hi = mid; }
  const seg = cum[hi] - cum[lo] || 1;
  const t = (l - cum[lo]) / seg;
  return { p: { x: points[lo].x + (points[hi].x - points[lo].x) * t, y: points[lo].y + (points[hi].y - points[lo].y) * t }, i: lo };
}

export function createPaintingRenderer(canvas: HTMLCanvasElement, plan: PortraitPlan, duration: number) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = plan.width;
  canvas.height = plan.height;
  ctx.lineJoin = 'round';

  // Чистый льняной холст.
  ctx.fillStyle = LINEN;
  ctx.fillRect(0, 0, plan.width, plan.height);
  const tooth = ctx.createLinearGradient(0, 0, plan.width, plan.height);
  tooth.addColorStop(0, 'rgba(255,250,240,.35)');
  tooth.addColorStop(1, 'rgba(120,90,70,.12)');
  ctx.fillStyle = tooth;
  ctx.fillRect(0, 0, plan.width, plan.height);

  const grain = makeGrain(ctx, [40, 30, 33]);
  const photo = ctx.createPattern(plan.photo, 'no-repeat')!;
  const cache = new Map<Stroke, Prepared>();
  const prep = (s: Stroke) => { let p = cache.get(s); if (!p) { p = prepare(s); cache.set(s, p); } return p; };
  const unit = Math.max(plan.width, plan.height) / 1000;

  /* ---- расписание ---- */
  type Sched = { start: number; dur: number; trip: number; starts: Float64Array; costs: Float64Array; air: Float64Array; total: number; doneBefore: number };
  let acc = 0, doneBefore = 0;
  const sched: Sched[] = plan.phases.map((phase) => {
    const dur = phase.weight * duration;
    const trip = phase.visitPalette ? Math.min(PALETTE_TRIP_MS, dur * 0.3) : 0;
    const n = phase.strokes.length;
    const starts = new Float64Array(n + 1), costs = new Float64Array(n), air = new Float64Array(n);
    const ref = 60 * unit;
    let c = 0;
    for (let i = 0; i < n; i++) {
      const s = phase.strokes[i];
      const a = s.tool === 'charcoal' ? 0.45 : s.tool === 'wash' || s.tool === 'glaze' ? 0.5 : 0.3;
      const draw = s.text ? 10 : Math.max(0.25, s.length / ref);
      starts[i] = c; costs[i] = a + draw; air[i] = a / (a + draw);
      c += a + draw;
    }
    starts[n] = c;
    const s: Sched = { start: acc, dur, trip, starts, costs, air, total: c, doneBefore };
    acc += dur; doneBefore += n;
    return s;
  });

  /* ---- рисование кусочка мазка [l0, l1] ---- */
  const drawPiece = (stroke: Stroke, l0: number, l1: number) => {
    if (l1 <= l0) return;
    const L = stroke.length || 1;
    if (stroke.text) { drawSignature(stroke, l0 / L, l1 / L); return; }
    const pr = prep(stroke);

    const path = (from: number, to: number, off: number) => {
      const a = pointAt(stroke, from), b = pointAt(stroke, to);
      const na = pr.normals[a.i], nb = pr.normals[b.i];
      ctx.beginPath();
      ctx.moveTo(a.p.x + na.x * off, a.p.y + na.y * off);
      for (let i = a.i + 1; i <= b.i; i++) {
        const p = stroke.points[i], n = pr.normals[i];
        ctx.lineTo(p.x + n.x * off, p.y + n.y * off);
      }
      ctx.lineTo(b.p.x + nb.x * off, b.p.y + nb.y * off);
      ctx.stroke();
    };

    if (stroke.tool === 'charcoal') {
      ctx.lineCap = 'round';
      ctx.strokeStyle = grain;
      ctx.globalAlpha = stroke.alpha;
      // Нажим: сильнее в середине линии, легче на входе и выходе.
      const mid = (l0 + l1) / 2 / L;
      ctx.lineWidth = stroke.width * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, Math.max(0, mid))));
      path(l0, l1, 0);
      ctx.globalAlpha = stroke.alpha * 0.25;
      ctx.strokeStyle = 'rgb(40,30,33)';
      ctx.lineWidth = Math.max(0.6, stroke.width * 0.35);
      path(l0, l1, 0);
      ctx.globalAlpha = 1;
      return;
    }

    if (stroke.tool === 'glaze') {
      // Лессировка: несколько прозрачных проходов с убывающей шириной — мягкий край.
      ctx.lineCap = 'round';
      ctx.strokeStyle = photo;
      for (const k of [1, 0.72, 0.45]) {
        ctx.globalAlpha = stroke.alpha * 0.45;
        ctx.lineWidth = stroke.width * k;
        path(l0, l1, 0);
      }
      ctx.globalAlpha = 1;
      return;
    }

    ctx.lineCap = 'butt';
    // Тело мазка — сплошная краска под щетинками.
    // У мелких кистей тело мазка несёт точный цвет фото, щетинки дают фактуру поверх.
    const fine = stroke.tool === 'round' || stroke.tool === 'rigger';
    const bodyAlpha = stroke.tool === 'wash' ? 0.05 : fine ? stroke.alpha * 0.75 : stroke.alpha * 0.5;
    const bodyW = stroke.width * (stroke.tool === 'flat' ? 0.78 : stroke.tool === 'wash' ? 0.9 : 0.55);
    const b0 = Math.max(l0, L * 0.06), b1 = Math.min(l1, L * 0.88);
    if (b1 > b0) {
      ctx.globalAlpha = bodyAlpha;
      ctx.strokeStyle = fine ? photo : css(stroke.color);
      ctx.lineWidth = bodyW;
      path(b0, b1, 0);
    }
    for (const br of pr.bristles) {
      const f = Math.max(l0, br.from * L), t = Math.min(l1, br.to * L);
      if (t <= f) continue;
      ctx.globalAlpha = fine ? br.alpha * 0.55 : br.alpha;
      ctx.strokeStyle = fine ? photo : br.color;
      ctx.lineWidth = br.w;
      path(f, t, br.off * stroke.width);
    }
    ctx.globalAlpha = 1;
  };

  const drawSignature = (stroke: Stroke, u0: number, u1: number) => {
    const t = stroke.text!;
    ctx.save();
    ctx.font = t.font;
    const w = ctx.measureText(t.value).width;
    const size = stroke.width;
    ctx.beginPath();
    ctx.rect(t.left + w * u0 - 1, t.baseline - size * 1.3, w * (u1 - u0) + 2, size * 1.8);
    ctx.clip();
    ctx.fillStyle = css(stroke.color);
    ctx.globalAlpha = 0.92;
    ctx.fillText(t.value, t.left, t.baseline);
    ctx.restore();
  };

  /* ---- состояние ---- */
  let dp = 0, dk = 0, du = 0; // уже нарисовано: фаза, мазок, доля мазка
  let finished = false;

  const drawUntil = (p: number, k: number, u: number) => {
    while (dp < p || (dp === p && (dk < k || (dk === k && du < u)))) {
      const phase = plan.phases[dp];
      if (dk >= phase.strokes.length) { dp++; dk = 0; du = 0; continue; }
      const stroke = phase.strokes[dk];
      const target = dp === p && dk === k ? u : 1;
      if (target > du) drawPiece(stroke, du * stroke.length, target * stroke.length);
      if (target >= 1) { dk++; du = 0; } else { du = target; break; }
    }
  };

  const ease = (t: number) => 0.7 * t + 0.3 * (0.5 - 0.5 * Math.cos(Math.PI * t));

  const lastPointBefore = (pi: number, k: number): Point => {
    for (let p = pi; p >= 0; p--) {
      const list = plan.phases[p].strokes;
      const idx = p === pi ? k - 1 : list.length - 1;
      if (idx >= 0 && list[idx]) { const pts = list[idx].points; return pts[pts.length - 1]; }
    }
    return { x: plan.width * 1.1, y: plan.height * 0.6 };
  };

  const strokeColor = (s: Stroke) => s.tool === 'charcoal' ? 'rgb(44,36,38)' : s.tool === 'glaze' ? 'rgba(120,60,50,.6)' : css(s.color);

  return {
    advance(ms: number): PaintFrame {
      if (finished) return { brush: null, phaseIndex: plan.phases.length - 1, strokesDone: plan.totalStrokes, done: true };
      if (ms >= duration) {
        drawUntil(plan.phases.length, 0, 0);
        finished = true;
        return { brush: null, phaseIndex: plan.phases.length - 1, strokesDone: plan.totalStrokes, done: true };
      }
      let pi = sched.findIndex((s) => ms < s.start + s.dur);
      if (pi < 0) pi = sched.length - 1;
      const s = sched[pi];
      const phase = plan.phases[pi];
      const local = ms - s.start;
      const first = phase.strokes[0];

      if (local < s.trip) {
        drawUntil(pi, 0, 0);
        return {
          brush: { mode: 'palette', t: local / s.trip, from: lastPointBefore(pi, 0), to: first.points[0], tool: first.tool, color: phase.paints[0] ?? strokeColor(first), paintIndex: 0 },
          phaseIndex: pi, strokesDone: s.doneBefore, done: false
        };
      }

      const t = Math.min(1, (local - s.trip) / Math.max(1, s.dur - s.trip));
      const c = ease(t) * s.total;
      let lo = 0, hi = phase.strokes.length;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (s.starts[mid] <= c) lo = mid; else hi = mid; }
      const k = Math.min(phase.strokes.length - 1, lo);
      const f = Math.min(1, (c - s.starts[k]) / s.costs[k]);
      const stroke = phase.strokes[k];
      const airFrac = s.air[k];

      if (f < airFrac) {
        drawUntil(pi, k, 0);
        const q = f / airFrac;
        const e = q * q * (3 - 2 * q);
        const a = lastPointBefore(pi, k), b = stroke.points[0];
        return {
          brush: { mode: 'canvas', x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, pressing: false, tool: stroke.tool, color: strokeColor(stroke) },
          phaseIndex: pi, strokesDone: s.doneBefore + k, done: false
        };
      }
      const u = (f - airFrac) / (1 - airFrac);
      drawUntil(pi, k, u);
      const p = stroke.text ? { x: stroke.points[0].x + (stroke.points[stroke.points.length - 1].x - stroke.points[0].x) * u, y: pointAt(stroke, u * stroke.length).p.y } : pointAt(stroke, u * stroke.length).p;
      return {
        brush: { mode: 'canvas', x: p.x, y: p.y, pressing: true, tool: stroke.tool, color: strokeColor(stroke) },
        phaseIndex: pi, strokesDone: s.doneBefore + k, done: false
      };
    },
    /** Мгновенно дописать картину (для prefers-reduced-motion). */
    finish() { drawUntil(plan.phases.length, 0, 0); finished = true; }
  };
}

export type PaintingRenderer = ReturnType<typeof createPaintingRenderer>;
