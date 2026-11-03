import { useEffect, useRef } from 'react';
import { CONFIG } from '../config';
import { CelebrationEngine } from '../animations/confettiAnimation';
export function Celebration({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const engine = useRef<CelebrationEngine | null>(null);
  useEffect(() => { if (!ref.current) return; engine.current = new CelebrationEngine(ref.current, CONFIG.confettiAmount); const resize = () => engine.current?.resize(); addEventListener('resize', resize); return () => { removeEventListener('resize', resize); engine.current?.stop(); }; }, []);
  useEffect(() => { if (active) engine.current?.start(); else engine.current?.stop(); }, [active]);
  return <canvas ref={ref} className={`celebration-canvas ${active ? 'active' : ''}`} aria-hidden="true" />;
}
