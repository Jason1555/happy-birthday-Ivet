import { CONFIG } from '../config';
import { seeded } from './canvasUtils';
import type { Phase, Point, PortraitPlan, RGB, Stroke, Tool } from '../types';

/*
 * Планировщик портрета.
 *
 * Фото раскладывается на мазки так, как пишет живописец:
 *   грунт      — тонированная имприматура широкой кистью;
 *   набросок   — углём по реальным контурам фото + штриховка теней;
 *   подмалёвок — крупные приглушённые мазки, закрывают весь холст;
 *   живопись   — средние мазки, кладутся только там, где картина ещё расходится с фото;
 *   детали     — мелкие мазки по краям форм и бликам;
 *   подпись.
 *
 * Мазки строятся по алгоритму Hertzmann (Painterly Rendering with Curved Brush
 * Strokes): каждый мазок идёт вдоль изофот (поле направлений из структурного
 * тензора), цвет берётся из размытой копии фото в той же точке, а каждый
 * следующий слой кладётся только туда, где ошибка относительно фото велика.
 * Слои симулируются на маленьком скрытом холсте, поэтому решение «нужен ли
 * здесь мазок» принимается по тому, что действительно уже нарисовано.
 */

const ANALYSIS_SIZE = 420;
const LINEN: RGB = [231, 221, 204];
const GROUND_TONE: RGB = [150, 86, 76];
const CHARCOAL: RGB = [40, 30, 33];

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function loadPortrait(source?: string | HTMLImageElement | HTMLCanvasElement): Promise<HTMLImageElement | HTMLCanvasElement> {
  if (source instanceof HTMLImageElement || source instanceof HTMLCanvasElement) {
    return source;
  }
  const path = typeof source === 'string' && source ? source : CONFIG.portraitPath;
  const image = new Image();
  image.decoding = 'async';
  image.crossOrigin = 'anonymous';
  image.src = path;
  try {
    await image.decode();
    if (image.naturalWidth > 0) return image;
  } catch {
    if (!CONFIG.devPlaceholder) throw new Error(`Failed to load ${path}`);
  }
  return createDevPortrait();
}

/** Выразительный художественный портрет по умолчанию, если нет собственного фото. */
function createDevPortrait() {
  const c = createCanvas(900, 1125);
  const ctx = c.getContext('2d')!;

  // 1. Тёплый глубокий бархатный фон мастерской
  const g = ctx.createLinearGradient(0, 0, 900, 1125);
  g.addColorStop(0, '#5a1d29');
  g.addColorStop(0.4, '#38101a');
  g.addColorStop(1, '#1b060d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);

  // 2. Мягкое студийное световое гало за силуэтом
  const rim = ctx.createRadialGradient(450, 480, 50, 450, 480, 420);
  rim.addColorStop(0, 'rgba(230, 150, 120, 0.32)');
  rim.addColorStop(0.5, 'rgba(140, 50, 65, 0.14)');
  rim.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, c.width, c.height);

  // 3. Плечи и тёмный винный пиджак/жакет
  ctx.fillStyle = '#260a12';
  ctx.beginPath();
  ctx.moveTo(90, 1125);
  ctx.quadraticCurveTo(240, 780, 360, 750);
  ctx.lineTo(540, 750);
  ctx.quadraticCurveTo(660, 780, 810, 1125);
  ctx.closePath();
  ctx.fill();

  // 4. Белый воротник и вырез рубашки
  ctx.fillStyle = '#eae2d6';
  ctx.beginPath();
  ctx.moveTo(395, 740);
  ctx.lineTo(450, 815);
  ctx.lineTo(505, 740);
  ctx.closePath();
  ctx.fill();

  // 5. Шея со светотенью
  const neckGrad = ctx.createLinearGradient(390, 640, 510, 640);
  neckGrad.addColorStop(0, '#be7b5c');
  neckGrad.addColorStop(0.4, '#ddaa8a');
  neckGrad.addColorStop(1, '#9e5a3c');
  ctx.fillStyle = neckGrad;
  ctx.fillRect(405, 620, 90, 135);

  // 6. Форма лица со светотенью
  const face = ctx.createRadialGradient(425, 440, 40, 450, 470, 240);
  face.addColorStop(0, '#fae1cd');
  face.addColorStop(0.5, '#e4b090');
  face.addColorStop(0.85, '#b97455');
  face.addColorStop(1, '#7e422c');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.ellipse(450, 465, 175, 230, 0, 0, Math.PI * 2);
  ctx.fill();

  // 7. Объёмная тёмная причёска с локонами
  const hair = ctx.createRadialGradient(450, 310, 80, 450, 330, 240);
  hair.addColorStop(0, '#4e3325');
  hair.addColorStop(0.7, '#2b1a14');
  hair.addColorStop(1, '#150a07');
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(450, 320, 215, 145, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(450, 340, 205, 90, 0, 0, Math.PI);
  ctx.fill();

  // 8. Брови
  ctx.fillStyle = '#3a2016';
  ctx.beginPath();
  ctx.ellipse(385, 415, 34, 10, -0.08, 0, Math.PI * 2);
  ctx.ellipse(515, 415, 34, 10, 0.08, 0, Math.PI * 2);
  ctx.fill();

  // 9. Глаза с живым взглядом и бликами
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(385, 455, 24, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(515, 455, 24, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f291e';
  ctx.beginPath();
  ctx.arc(385, 455, 11, 0, Math.PI * 2);
  ctx.arc(515, 455, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(388, 452, 3.5, 0, Math.PI * 2);
  ctx.arc(518, 452, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 10. Тень и спинка носа
  ctx.fillStyle = 'rgba(150, 75, 50, 0.32)';
  ctx.beginPath();
  ctx.moveTo(443, 430);
  ctx.lineTo(448, 515);
  ctx.lineTo(435, 524);
  ctx.lineTo(465, 524);
  ctx.lineTo(454, 515);
  ctx.lineTo(457, 430);
  ctx.fill();

  // 11. Тёплая улыбка
  ctx.strokeStyle = '#8f3d3d';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(450, 560, 52, 0.3, Math.PI - 0.3);
  ctx.stroke();

  // 12. Мягкий румянец
  const blush = ctx.createRadialGradient(370, 510, 10, 370, 510, 60);
  blush.addColorStop(0, 'rgba(215, 80, 80, 0.22)');
  blush.addColorStop(1, 'rgba(215, 80, 80, 0)');
  ctx.fillStyle = blush;
  ctx.beginPath(); ctx.arc(370, 510, 60, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(530, 510, 60, 0, Math.PI * 2); ctx.fill();

  return c;
}

/* ---------- растровые утилиты ---------- */

type Img = { w: number; h: number; r: Float32Array; g: Float32Array; b: Float32Array };

function readImg(canvas: HTMLCanvasElement): Img {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  const r = new Float32Array(w * h), g = new Float32Array(w * h), b = new Float32Array(w * h);
  for (let i = 0, j = 0; i < w * h; i++, j += 4) { r[i] = d[j]; g[i] = d[j + 1]; b[i] = d[j + 2]; }
  return { w, h, r, g, b };
}

function boxBlurChannel(src: Float32Array, w: number, h: number, radius: number) {
  const rad = Math.max(1, Math.round(radius));
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    const row = y * w;
    for (let x = -rad; x <= rad; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / (2 * rad + 1);
      acc += src[row + Math.min(w - 1, x + rad + 1)] - src[row + Math.max(0, x - rad)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -rad; y <= rad; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / (2 * rad + 1);
      acc += tmp[Math.min(h - 1, y + rad + 1) * w + x] - tmp[Math.max(0, y - rad) * w + x];
    }
  }
  return out;
}

/** Два прохода box-blur ≈ гауссово размытие. */
function blurArr(src: Float32Array, w: number, h: number, radius: number) {
  if (radius < 0.75) return src.slice();
  const r = radius / 1.6;
  return boxBlurChannel(boxBlurChannel(src, w, h, r), w, h, r);
}

function blurImg(img: Img, radius: number): Img {
  return { w: img.w, h: img.h, r: blurArr(img.r, img.w, img.h, radius), g: blurArr(img.g, img.w, img.h, radius), b: blurArr(img.b, img.w, img.h, radius) };
}

function luminance(img: Img) {
  const out = new Float32Array(img.w * img.h);
  for (let i = 0; i < out.length; i++) out[i] = img.r[i] * 0.299 + img.g[i] * 0.587 + img.b[i] * 0.114;
  return out;
}

function percentile(arr: Float32Array, p: number) {
  const step = Math.max(1, Math.floor(arr.length / 6000));
  const sample: number[] = [];
  for (let i = 0; i < arr.length; i += step) sample.push(arr[i]);
  sample.sort((a, b) => a - b);
  return sample[Math.min(sample.length - 1, Math.floor(sample.length * p))];
}

/* ---------- поле направлений ---------- */

type Flow = { tx: Float32Array; ty: Float32Array; mag: Float32Array };

function buildFlow(lum: Float32Array, w: number, h: number): Flow {
  const L = blurArr(lum, w, h, 1.2);
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h), mag = new Float32Array(w * h);
  const at = (x: number, y: number) => L[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const sy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      const i = y * w + x;
      gx[i] = sx; gy[i] = sy; mag[i] = Math.hypot(sx, sy);
    }
  }
  // Структурный тензор, сглаженный — даёт плавное поле без шума.
  const jxx = new Float32Array(w * h), jxy = new Float32Array(w * h), jyy = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) { jxx[i] = gx[i] * gx[i]; jxy[i] = gx[i] * gy[i]; jyy[i] = gy[i] * gy[i]; }
  const sr = Math.max(3, Math.min(w, h) / 45);
  const bxx = blurArr(jxx, w, h, sr), bxy = blurArr(jxy, w, h, sr), byy = blurArr(jyy, w, h, sr);
  const tx = new Float32Array(w * h), ty = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    // Направление градиента = 0.5·atan2(2Jxy, Jxx−Jyy); касательная к изофоте перпендикулярна.
    const theta = 0.5 * Math.atan2(2 * bxy[i], bxx[i] - byy[i]) + Math.PI / 2;
    tx[i] = Math.cos(theta); ty[i] = Math.sin(theta);
  }
  return { tx, ty, mag };
}

/* ---------- геометрия мазков ---------- */

function finalizeStroke(raw: Point[], scale: number, width: number, alpha: number, color: RGB, tool: Tool, seed: number): Stroke {
  const points = raw.map((p) => ({ x: p.x * scale, y: p.y * scale }));
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  return { points, cum, length: cum[cum.length - 1], width, alpha, color, tool, seed };
}

/** Мазки в порядке «ближайший следующий», чтобы кисть работала участками, а не прыгала по холсту. */
function orderNearest(strokes: Stroke[], start: Point, jitter: () => number) {
  const left = strokes.slice();
  const out: Stroke[] = [];
  let cx = start.x, cy = start.y;
  while (left.length) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < left.length; i++) {
      const p = left[i].points[0];
      const d = (p.x - cx) ** 2 + (p.y - cy) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    }
    // Изредка художник отвлекается на соседний участок.
    if (left.length > 3 && jitter() < 0.06) best = Math.floor(jitter() * Math.min(left.length, 6));
    const s = left.splice(best, 1)[0];
    out.push(s);
    const e = s.points[s.points.length - 1];
    cx = e.x; cy = e.y;
  }
  return out;
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function rgbCss(c: RGB, a = 1) {
  return a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}

/** Несколько характерных красок слоя — их художник «выдавливает» на палитру. */
function paintsOf(strokes: Stroke[], count: number): string[] {
  const buckets = new Map<number, { c: [number, number, number]; n: number }>();
  for (const s of strokes) {
    const key = ((s.color[0] >> 5) << 6) | ((s.color[1] >> 5) << 3) | (s.color[2] >> 5);
    const b = buckets.get(key) ?? { c: [0, 0, 0], n: 0 };
    b.c[0] += s.color[0]; b.c[1] += s.color[1]; b.c[2] += s.color[2]; b.n++;
    buckets.set(key, b);
  }
  return [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, count)
    .map((b) => rgbCss([b.c[0] / b.n, b.c[1] / b.n, b.c[2] / b.n]));
}

/* ---------- план ---------- */

export async function buildPortraitPlan(
  image: CanvasImageSource,
  naturalW: number,
  naturalH: number,
  signatureText: string = CONFIG.signature
): Promise<PortraitPlan> {
  const fit = Math.min(1, CONFIG.maxImageDimension / Math.max(naturalW, naturalH));
  const W = Math.max(1, Math.round(naturalW * fit));
  const H = Math.max(1, Math.round(naturalH * fit));
  const aScale = ANALYSIS_SIZE / Math.max(W, H);
  const aw = Math.max(8, Math.round(W * aScale));
  const ah = Math.max(8, Math.round(H * aScale));
  const S = W / aw; // анализ → холст
  const unit = Math.max(W, H) / 1000; // «миллиметр» холста для толщины линий

  const small = createCanvas(aw, ah);
  const sctx = small.getContext('2d', { willReadFrequently: true })!;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(image, 0, 0, aw, ah);
  const src = readImg(small);
  const lum = luminance(src);
  const flow = buildFlow(lum, aw, ah);
  const rng = seeded(aw * 7919 + ah * 104729);
  const idx = (x: number, y: number) => Math.min(ah - 1, Math.max(0, Math.round(y))) * aw + Math.min(aw - 1, Math.max(0, Math.round(x)));

  /* --- 1. грунт --- */
  const groundStrokes: Stroke[] = [];
  const rows = 9;
  for (let i = 0; i < rows; i++) {
    const y = ((i + 0.5) / rows) * ah;
    const ltr = i % 2 === 0;
    const pts: Point[] = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const x = (ltr ? -0.06 + t * 1.12 : 1.06 - t * 1.12) * aw;
      pts.push({ x, y: y + Math.sin(t * Math.PI * 1.3 + i) * ah * 0.012 + (t - 0.5) * ah * 0.03 });
    }
    const tone = mix(GROUND_TONE, [120, 62, 58], rng() * 0.5);
    groundStrokes.push(finalizeStroke(pts, S, (H / rows) * 1.55, 0.2, tone, 'wash', rng()));
  }
  for (let i = 0; i < 3; i++) {
    const x0 = (0.1 + rng() * 0.8) * aw;
    const pts: Point[] = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push({ x: x0 + (t - 0.5) * aw * 0.5, y: (0.05 + t * 0.9) * ah }); }
    groundStrokes.push(finalizeStroke(pts, S, H / 8, 0.1, GROUND_TONE, 'wash', rng()));
  }
  const ground = mix(LINEN, GROUND_TONE, 0.55);

  /* --- 2. набросок углём --- */
  const thr = percentile(flow.mag, 0.9);
  const seeds: number[] = [];
  for (let i = 0; i < flow.mag.length; i++) if (flow.mag[i] > thr) seeds.push(i);
  seeds.sort((a, b) => flow.mag[b] - flow.mag[a]);
  const visited = new Uint8Array(aw * ah);
  const mark = (x: number, y: number) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = Math.round(x) + dx, yy = Math.round(y) + dy;
      if (xx >= 0 && yy >= 0 && xx < aw && yy < ah) visited[yy * aw + xx] = 1;
    }
  };
  const trace = (sx: number, sy: number, sign: number) => {
    const pts: Point[] = [];
    let x = sx, y = sy;
    let px = flow.tx[idx(x, y)] * sign, py = flow.ty[idx(x, y)] * sign;
    for (let step = 0; step < 90; step++) {
      const i = idx(x, y);
      let dx = flow.tx[i], dy = flow.ty[i];
      if (dx * px + dy * py < 0) { dx = -dx; dy = -dy; }
      dx = dx * 0.7 + px * 0.3; dy = dy * 0.7 + py * 0.3;
      const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
      x += dx * 1.4; y += dy * 1.4;
      if (x < 1 || y < 1 || x > aw - 2 || y > ah - 2) break;
      const j = idx(x, y);
      if (flow.mag[j] < thr * 0.42 || visited[j]) break;
      pts.push({ x, y });
      px = dx; py = dy;
    }
    return pts;
  };
  const contourStrokes: Stroke[] = [];
  const maxContours = 340;
  for (const s of seeds) {
    if (contourStrokes.length >= maxContours) break;
    if (visited[s]) continue;
    const sx = s % aw, sy = Math.floor(s / aw);
    const fwd = trace(sx, sy, 1);
    const back = trace(sx, sy, -1);
    const line = [...back.reverse(), { x: sx, y: sy }, ...fwd];
    for (const p of line) mark(p.x, p.y);
    if (line.length < 7) continue;
    // Прореживаем, слегка дрожим и даём концам «перелёт», как у живой руки.
    const sparse = line.filter((_, k) => k % 3 === 0 || k === line.length - 1);
    const a = sparse[0], b = sparse[1] ?? a, y2 = sparse[sparse.length - 1], z = sparse[sparse.length - 2] ?? y2;
    const over = 1.6 + rng() * 2;
    const la = Math.hypot(a.x - b.x, a.y - b.y) || 1, lz = Math.hypot(y2.x - z.x, y2.y - z.y) || 1;
    const pts = [
      { x: a.x + (a.x - b.x) / la * over, y: a.y + (a.y - b.y) / la * over },
      ...sparse.map((p) => ({ x: p.x + (rng() - 0.5) * 0.5, y: p.y + (rng() - 0.5) * 0.5 })),
      { x: y2.x + (y2.x - z.x) / lz * over, y: y2.y + (y2.y - z.y) / lz * over }
    ];
    const strength = Math.min(1, flow.mag[s] / (thr * 3));
    contourStrokes.push(finalizeStroke(pts, S, (1.8 + strength * 2.6) * unit, 0.55 + strength * 0.35, CHARCOAL, 'charcoal', rng()));
  }

  // Штриховка теней: параллельные штрихи в тёмных зонах, как делают при построении тона.
  const lumSoft = blurArr(lum, aw, ah, 4);
  const dark = percentile(lumSoft, 0.28), darker = percentile(lumSoft, 0.12);
  const hatch: Stroke[] = [];
  const step = Math.max(4, Math.round(Math.max(aw, ah) / 46));
  const hatchAngle = -0.95;
  for (let y = step / 2; y < ah; y += step) {
    for (let x = step / 2; x < aw; x += step) {
      const jx = x + (rng() - 0.5) * step * 0.6, jy = y + (rng() - 0.5) * step * 0.6;
      const v = lumSoft[idx(jx, jy)];
      if (v > dark) continue;
      const depth = Math.min(1, (dark - v) / Math.max(1, dark - darker));
      const len = step * (1.1 + depth * 0.9);
      const ang = hatchAngle + (rng() - 0.5) * 0.18;
      const lines = depth > 0.75 ? 3 : 2;
      for (let k = 0; k < lines; k++) {
        const off = (k - (lines - 1) / 2) * step * 0.38;
        const cx = jx + Math.cos(ang + Math.PI / 2) * off, cy = jy + Math.sin(ang + Math.PI / 2) * off;
        hatch.push(finalizeStroke([
          { x: cx - Math.cos(ang) * len / 2, y: cy - Math.sin(ang) * len / 2 },
          { x: cx + Math.cos(ang) * len / 2 + (rng() - 0.5), y: cy + Math.sin(ang) * len / 2 + (rng() - 0.5) }
        ], S, (1.1 + rng() * 0.7) * unit, 0.22 + depth * 0.22, CHARCOAL, 'charcoal', rng()));
      }
    }
  }

  /* --- 3–5. живопись слоями --- */
  const sim = createCanvas(aw, ah);
  const simCtx = sim.getContext('2d', { willReadFrequently: true })!;
  simCtx.fillStyle = rgbCss(ground);
  simCtx.fillRect(0, 0, aw, ah);
  simCtx.lineCap = 'round';
  simCtx.lineJoin = 'round';

  type Layer = { radius: number; threshold: number; maxSteps: number; tool: Tool; alpha: number; muted: number; edgesOnly?: boolean; fullCover?: boolean; maxStrokes?: number };
  const R = (v: number) => v * (Math.max(aw, ah) / 300);
  const paintLayer = (layer: Layer) => {
    const ref = blurImg(src, layer.radius * 0.9);
    const simImg = readImg(sim);
    const grid = Math.max(1, Math.round(layer.radius * 0.95));
    const strokes: Stroke[] = [];
    const rawForSim: { pts: Point[]; color: RGB }[] = [];
    const edgeThr = percentile(flow.mag, 0.6);
    const dist = (i: number, c: RGB, img: Img) => Math.hypot(img.r[i] - c[0], img.g[i] - c[1], img.b[i] - c[2]);
    // Кандидаты: по одному на ячейку сетки, в точке наибольшего расхождения с фото.
    const cand: { x: number; y: number; e: number }[] = [];
    for (let gy = 0; gy < ah; gy += grid) {
      for (let gx = 0; gx < aw; gx += grid) {
        let sum = 0, n = 0, maxE = -1, mx = gx, my = gy;
        for (let y = gy; y < Math.min(ah, gy + grid); y++) {
          for (let x = gx; x < Math.min(aw, gx + grid); x++) {
            const i = y * aw + x;
            const e = Math.hypot(ref.r[i] - simImg.r[i], ref.g[i] - simImg.g[i], ref.b[i] - simImg.b[i]);
            sum += e; n++;
            if (e > maxE) { maxE = e; mx = x; my = y; }
          }
        }
        if (!layer.fullCover && sum / n < layer.threshold) continue;
        if (layer.edgesOnly && flow.mag[idx(mx, my)] < edgeThr) continue;
        if (layer.fullCover) { mx = gx + rng() * grid; my = gy + rng() * grid; }
        cand.push({ x: mx, y: my, e: sum / n });
      }
    }
    // Ограничение по количеству: оставляем мазки там, где картина расходится с фото сильнее всего.
    if (layer.maxStrokes && cand.length > layer.maxStrokes) { cand.sort((a, b) => b.e - a.e); cand.length = layer.maxStrokes; }
    for (const { x: mx, y: my } of cand) {
      {
        const i0 = idx(mx, my);
        let color: RGB = [ref.r[i0], ref.g[i0], ref.b[i0]];
        // Живописная вибрация цвета: чуть теплее/холоднее, светлее/темнее.
        const l = 1 + (rng() - 0.5) * 0.09, warm = (rng() - 0.5) * 8;
        color = [Math.min(255, color[0] * l + warm), Math.min(255, color[1] * l), Math.min(255, color[2] * l - warm)];
        if (layer.muted > 0) {
          const grey = color[0] * 0.3 + color[1] * 0.59 + color[2] * 0.11;
          color = mix(mix(color, [grey, grey, grey], layer.muted * 0.6), GROUND_TONE, layer.muted * 0.3);
        }
        const pts: Point[] = [{ x: mx, y: my }];
        let x = mx, y = my, px = 0, py = 0;
        for (let k = 1; k <= layer.maxSteps; k++) {
          const i = idx(x, y);
          if (k > 2 && dist(i, color, ref) > dist(i, color, simImg) + 6) break;
          let dx = flow.tx[i], dy = flow.ty[i];
          if (k > 1 && dx * px + dy * py < 0) { dx = -dx; dy = -dy; }
          if (k > 1) { dx = dx * 0.65 + px * 0.35; dy = dy * 0.65 + py * 0.35; const nn = Math.hypot(dx, dy) || 1; dx /= nn; dy /= nn; }
          const nx = x + dx * layer.radius, ny = y + dy * layer.radius;
          if (nx < -layer.radius || ny < -layer.radius || nx > aw + layer.radius || ny > ah + layer.radius) break;
          x = nx; y = ny; px = dx; py = dy;
          pts.push({ x, y });
        }
        if (pts.length === 1) {
          const i = idx(mx, my);
          pts.push({ x: mx + flow.tx[i] * layer.radius * 0.7, y: my + flow.ty[i] * layer.radius * 0.7 });
        }
        rawForSim.push({ pts, color });
        strokes.push(finalizeStroke(pts, S, layer.radius * 2 * S * (0.85 + rng() * 0.3), layer.alpha, color, layer.tool, rng()));
      }
    }
    for (const r of rawForSim) {
      simCtx.strokeStyle = rgbCss(r.color, 0.9);
      simCtx.lineWidth = layer.radius * 1.75;
      simCtx.beginPath();
      simCtx.moveTo(r.pts[0].x, r.pts[0].y);
      for (const p of r.pts.slice(1)) simCtx.lineTo(p.x, p.y);
      simCtx.stroke();
    }
    return strokes;
  };

  const under = paintLayer({ radius: R(13), threshold: 0, maxSteps: 6, tool: 'flat', alpha: 0.92, muted: 0.55, fullCover: true });
  const paintA = paintLayer({ radius: R(7.5), threshold: 18, maxSteps: 7, tool: 'filbert', alpha: 0.9, muted: 0, maxStrokes: 1800 });
  const paintB = paintLayer({ radius: R(4.6), threshold: 17, maxSteps: 7, tool: 'filbert', alpha: 0.9, muted: 0, maxStrokes: 2600 });
  const detailA = paintLayer({ radius: R(2.8), threshold: 18, maxSteps: 6, tool: 'round', alpha: 0.92, muted: 0, maxStrokes: 2600 });
  const detailB = paintLayer({ radius: R(1.7), threshold: 20, maxSteps: 5, tool: 'rigger', alpha: 0.95, muted: 0, edgesOnly: true, maxStrokes: 2000 });
  const detailC = paintLayer({ radius: R(1.15), threshold: 24, maxSteps: 4, tool: 'rigger', alpha: 0.95, muted: 0, edgesOnly: true, maxStrokes: 1200 });

  /* --- 6. лессировка --- */
  // Прозрачные слои поверх деталей: там, где мелких мазков больше всего (обычно лицо),
  // художник проходит тонкими лессировками и уточняет форму.
  const cell = Math.max(4, Math.round(R(12)));
  const cols = Math.ceil(aw / cell), rowsN = Math.ceil(ah / cell);
  const density = new Float32Array(cols * rowsN);
  for (const st of [...detailA, ...detailB, ...detailC]) {
    const p = st.points[0];
    const cx = Math.min(cols - 1, Math.floor(p.x / S / cell)), cy = Math.min(rowsN - 1, Math.floor(p.y / S / cell));
    density[cy * cols + cx] += st.tool === 'rigger' ? 1.5 : 1;
  }
  const nonzero = Array.from(density).filter((v) => v > 0).sort((a, b) => a - b);
  const dThr = nonzero.length ? nonzero[Math.floor(nonzero.length * 0.6)] : Infinity;
  const glazeStrokes: Stroke[] = [];
  for (let cy = 0; cy < rowsN; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const d = density[cy * cols + cx];
      if (d < dThr || d === 0) continue;
      for (let k = 0; k < 2; k++) {
        let x = (cx + 0.2 + rng() * 0.6) * cell, y = (cy + 0.2 + rng() * 0.6) * cell;
        const pts: Point[] = [{ x, y }];
        let px = 0, py = 0;
        for (let st = 0; st < 4; st++) {
          const i = idx(x, y);
          let dx = flow.tx[i], dy = flow.ty[i];
          if (st > 0 && dx * px + dy * py < 0) { dx = -dx; dy = -dy; }
          x += dx * cell * 0.38; y += dy * cell * 0.38; px = dx; py = dy;
          pts.push({ x, y });
        }
        glazeStrokes.push(finalizeStroke(pts, S, cell * S * (0.75 + rng() * 0.3), 0.42, [0, 0, 0], 'glaze', rng()));
      }
    }
  }


  /* --- 6. подпись --- */
  const signatureStrokes: Stroke[] = [];
  const sig = signatureText?.trim() || '';
  if (sig) {
    const fontSize = Math.round(W * 0.036);
    try { await document.fonts.load(`${fontSize}px "Bad Script"`); } catch { /* шрифт не обязателен */ }
    const m = createCanvas(10, 10).getContext('2d')!;
    m.font = `${fontSize}px "Bad Script", cursive`;
    const tw = m.measureText(sig).width;
    const right = W * 0.955, base = H * 0.958;
    const left = right - tw;
    // Цвет подписи — по средней яркости под всей надписью, а не в одной точке.
    let bgSum = 0, bgN = 0;
    for (let k = 0; k <= 12; k++) for (const dy of [0.15, 0.45, 0.75]) {
      bgSum += lum[idx((left + (tw * k) / 12) / S, (base - fontSize * dy) / S)]; bgN++;
    }
    const bgLum = bgSum / bgN;
    const color: RGB = bgLum < 110 ? [236, 220, 200] : [92, 22, 38];
    const pts: Point[] = [];
    for (let k = 0; k <= 40; k++) {
      const t = k / 40;
      pts.push({ x: (left + t * tw) / S, y: (base - fontSize * (0.25 + 0.22 * Math.sin(t * Math.PI * 9))) / S });
    }
    const s = finalizeStroke(pts, S, fontSize, 1, color, 'rigger', 0.5);
    s.text = { value: sig, font: `${fontSize}px "Bad Script", cursive`, left, baseline: base };
    signatureStrokes.push(s);
  }

  /* --- порядок и фазы --- */
  const j = seeded(aw * 31 + 7);
  const center = { x: W * 0.5, y: H * 0.38 };
  const phases: Phase[] = [
    { id: 'ground', label: 'ground', weight: 0.07, strokes: groundStrokes, paints: [rgbCss(GROUND_TONE)], visitPalette: true },
    { id: 'sketch', label: 'sketch', weight: 0.19, strokes: [...orderNearest(contourStrokes, { x: W * 0.5, y: 0 }, j), ...orderNearest(hatch, center, j)], paints: [], visitPalette: false },
    { id: 'underpaint', label: 'underpainting', weight: 0.17, strokes: orderNearest(under, { x: 0, y: 0 }, j), paints: [], visitPalette: true },
    { id: 'paint', label: 'painting', weight: 0.25, strokes: [...orderNearest(paintA, { x: 0, y: 0 }, j), ...orderNearest(paintB, center, j)], paints: [], visitPalette: true },
    { id: 'detail', label: 'details', weight: 0.19, strokes: [...orderNearest(detailA, center, j), ...orderNearest([...detailB, ...detailC], center, j)], paints: [], visitPalette: true },
    { id: 'glaze', label: 'glazing', weight: 0.07, strokes: orderNearest(glazeStrokes, center, j), paints: ['rgba(120,60,50,.55)'], visitPalette: true },
    { id: 'signature', label: 'signature', weight: 0.07, strokes: signatureStrokes, paints: [], visitPalette: false }
  ];
  for (const p of phases) if (p.visitPalette && p.paints.length === 0) p.paints = paintsOf(p.strokes, 3);
  const live = phases.filter((p) => p.strokes.length > 0);
  const wsum = live.reduce((a, p) => a + p.weight, 0);
  for (const p of live) p.weight /= wsum;

  const photo = createCanvas(W, H);
  const pctx = photo.getContext('2d')!;
  pctx.imageSmoothingQuality = 'high';
  pctx.drawImage(image, 0, 0, W, H);

  return { width: W, height: H, ground, photo, phases: live, totalStrokes: live.reduce((a, p) => a + p.strokes.length, 0) } satisfies PortraitPlan;
}

export { rgbCss };
