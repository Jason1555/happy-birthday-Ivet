import { useEffect, useRef, useState } from 'react';
import { CONFIG, type CardConfig } from '../config';
import { buildPortraitPlan, loadPortrait } from '../utils/imageProcessing';
import { BrushMotion, paletteTrip } from '../animations/brushAnimation';
import { createPaintingRenderer } from '../animations/paintingAnimation';
import type { PhaseId, PortraitPlan, Tool } from '../types';
import type { SoftAudio } from '../utils/audio';
import { BrushArt } from './BrushArt';

type Props = {
  onFinished: () => void;
  audio: SoftAudio;
  photoUrl?: string | null;
  cardConfig?: CardConfig;
  preloadedPlan?: PortraitPlan | null;
};

/** Места на палитре, куда «выдавливается» краска: по краю, вокруг зоны смешивания. */
const SLOTS: [number, number][] = [[20, 30], [33, 17], [49, 12], [65, 14], [79, 23], [87, 40], [83, 60]];

const fmt = (n: number) => n.toLocaleString('en-US');

export function PaintingScene({
  onFinished,
  audio,
  photoUrl,
  cardConfig,
  preloadedPlan,
}: Props) {
  const sceneRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brushRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLParagraphElement>(null);
  const slotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [plan, setPlan] = useState<PortraitPlan | null>(preloadedPlan ?? null);
  const [phase, setPhase] = useState(-1);
  const [blobs, setBlobs] = useState<(string | null)[]>(() => SLOTS.map(() => null));
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (preloadedPlan) {
      setPlan(preloadedPlan);
      return;
    }
    (async () => {
      const image = await loadPortrait(photoUrl || CONFIG.portraitPath);
      if (cancelled) return;
      const nw = image instanceof HTMLCanvasElement ? image.width : image.naturalWidth;
      const nh = image instanceof HTMLCanvasElement ? image.height : image.naturalHeight;
      const p = await buildPortraitPlan(
        image,
        nw,
        nh,
        cardConfig?.signature ?? CONFIG.signature
      );
      if (!cancelled) setPlan(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [photoUrl, cardConfig?.signature, preloadedPlan]);

  useEffect(() => {
    if (plan) document.documentElement.style.setProperty('--ar', String(plan.width / plan.height));
  }, [plan]);

  useEffect(() => {
    if (!plan || !canvasRef.current) return;
    const duration = cardConfig?.paintingDuration ?? CONFIG.paintingDuration;
    const renderer = createPaintingRenderer(canvasRef.current, plan, duration);
    const motion = new BrushMotion();
    const brush = brushRef.current!;
    const sketchIndex = plan.phases.findIndex((p) => p.id === 'sketch');
    const sketchCount = sketchIndex >= 0 ? plan.phases[sketchIndex].strokes.length : 0;
    const before = plan.phases.map((_, i) => plan.phases.slice(0, i).reduce((a, p) => a + p.strokes.length, 0));
    let raf = 0, startedAt = 0, last = 0, shownPhase = -1, nextSlot = 0, lastTool: Tool | '' = '', lastLift = '', lastPaint = '', lastCounter = '';
    let ended = false;
    const blobSlotForPhase = new Map<number, number>();

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      renderer.finish();
      setPhase(plan.phases.length - 1);
      setFinished(true);
      const t = setTimeout(onFinished, 700);
      return () => clearTimeout(t);
    }

    audio.startBrush();

    const toScene = (x: number, y: number) => {
      const scene = sceneRef.current!.getBoundingClientRect();
      const r = canvasRef.current!.getBoundingClientRect();
      return { x: r.left - scene.left + (x / plan.width) * r.width, y: r.top - scene.top + (y / plan.height) * r.height };
    };
    const slotCenter = (i: number) => {
      const el = slotRefs.current[i];
      const scene = sceneRef.current!.getBoundingClientRect();
      if (!el) return { x: scene.width * 0.8, y: scene.height * 0.8 };
      const r = el.getBoundingClientRect();
      return { x: r.left - scene.left + r.width / 2, y: r.top - scene.top + r.height / 2 };
    };

    const tick = (now: number) => {
      if (!startedAt) { startedAt = now; last = now; }
      const dt = now - last; last = now;
      const frame = renderer.advance(now - startedAt);

      if (frame.phaseIndex !== shownPhase) {
        shownPhase = frame.phaseIndex;
        setPhase(shownPhase);
        const paints = plan.phases[shownPhase].paints;
        if (paints.length) {
          blobSlotForPhase.set(shownPhase, nextSlot % SLOTS.length);
          setBlobs((prev) => {
            const next = prev.slice();
            paints.forEach((c, k) => { next[(nextSlot + k) % SLOTS.length] = c; });
            return next;
          });
          nextSlot += paints.length;
        }
      }

      const sketchDone = Math.max(0, Math.min(sketchCount, frame.strokesDone - (sketchIndex >= 0 ? before[sketchIndex] : 0)));
      const paintDone = frame.strokesDone - sketchDone;
      const id: PhaseId = plan.phases[frame.phaseIndex].id;
      const counter =
        id === 'sketch'
          ? `${fmt(sketchDone)} ${sketchDone === 1 ? 'line' : 'lines'}`
          : `${fmt(paintDone)} ${paintDone === 1 ? 'stroke' : 'strokes'}`;
      if (counter !== lastCounter && counterRef.current) { counterRef.current.textContent = counter; lastCounter = counter; }

      if (frame.brush) {
        let target, pressing, lag = 55;
        if (frame.brush.mode === 'palette') {
          const slot = blobSlotForPhase.get(frame.phaseIndex) ?? 0;
          const trip = paletteTrip(frame.brush.t, toScene(frame.brush.from.x, frame.brush.from.y), slotCenter(slot), toScene(frame.brush.to.x, frame.brush.to.y), 9);
          target = trip.p; pressing = trip.pressing; lag = 28;
        } else {
          target = toScene(frame.brush.x, frame.brush.y);
          pressing = frame.brush.pressing;
        }
        motion.update(target, dt, lag);
        brush.style.transform = `translate3d(${motion.x.toFixed(1)}px, ${motion.y.toFixed(1)}px, 0) rotate(${(-34 + motion.tilt).toFixed(2)}deg)`;
        if (frame.brush.tool !== lastTool) { brush.dataset.tool = frame.brush.tool; lastTool = frame.brush.tool; }
        const lift = pressing ? 'down' : 'up';
        if (lift !== lastLift) { brush.dataset.lift = lift; lastLift = lift; }
        if (frame.brush.color !== lastPaint) { brush.style.setProperty('--paint', frame.brush.color); lastPaint = frame.brush.color; }
        audio.setBrush(pressing, frame.brush.tool);
      }

      if (frame.done) {
        if (!ended) {
          ended = true;
          audio.stopBrush();
          brush.dataset.lift = 'away';
          setFinished(true);
          setTimeout(onFinished, 650);
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); audio.stopBrush(); };
  }, [plan, onFinished, audio]);

  return (
    <section className={`studio ${finished ? 'is-finished' : ''}`} ref={sceneRef} aria-label="Artist painting portrait">
      <div className="wall"><div className="window-light"><i /><i /><i /><i /></div></div>
      <div className="floor" />

      <div className="progress" aria-live="polite">
        <ol className="stages">
          {(plan?.phases ?? []).map((p, i) => (
            <li key={p.id} data-state={i < phase ? 'done' : i === phase ? 'now' : 'next'}>{p.label}</li>
          ))}
        </ol>
        <p className="stroke-count" ref={counterRef}>{plan ? '' : 'Preparing canvas…'}</p>
      </div>

      <div className="easel">
        <div className="easel-leg back" />
        <div className="easel-leg left" />
        <div className="easel-leg right" />
        <div className="easel-mast" />
        <div className="board">
          <canvas ref={canvasRef} />
          <div className="weave" />
          <div className="sheen" />
        </div>
        <div className="easel-clamp" />
        <div className="easel-tray"><i /><i /></div>
      </div>

      <div className="side" aria-hidden="true">
      <div className="palette">
        <svg viewBox="0 0 220 160" className="palette-board">
          <defs>
            <linearGradient id="pal-wood" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#c99b68" />
              <stop offset=".6" stopColor="#a8784a" />
              <stop offset="1" stopColor="#7e5532" />
            </linearGradient>
          </defs>
          <path d="M112 6 C170 4 214 34 216 78 C218 122 180 154 120 155 C70 156 30 140 12 112 C2 96 6 82 22 78 C38 74 46 86 58 82 C70 78 66 62 52 56 C32 48 26 36 40 24 C58 10 84 7 112 6 Z" fill="url(#pal-wood)" />
          <path d="M112 6 C170 4 214 34 216 78 C218 122 180 154 120 155" stroke="rgba(255,235,205,.25)" strokeWidth="2" fill="none" />
          <ellipse cx="38" cy="66" rx="14" ry="11" fill="#2a0c13" opacity=".85" />
          <path d="M96 92 C112 82 136 86 140 100 C144 114 124 122 108 116 C96 112 88 100 96 92 Z" fill="rgba(80,40,30,.18)" />
        </svg>
        {SLOTS.map(([x, y], i) => (
          <span key={i} ref={(el) => { slotRefs.current[i] = el; }} className={`paint-blob ${blobs[i] ? 'is-filled' : ''}`}
            style={{ left: `${x}%`, top: `${y}%`, ['--c' as string]: blobs[i] ?? 'transparent', ['--r' as string]: `${(i * 47) % 70 - 35}deg` }} />
        ))}
      </div>
      <div className="stool"><i /><i /></div>
      </div>

      <div className="brush" ref={brushRef} data-tool="wash" data-lift="away"><BrushArt /></div>
    </section>
  );
}
