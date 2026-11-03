import { useEffect, useRef, useState } from 'react';
import { candleFrame } from '../animations/candleAnimation';

type Props = {
  onBlow: () => void;
  onStart: () => void;
  muted: boolean;
  onMute: () => void;
  onCustomize?: () => void;
  hasCustomPhoto?: boolean;
};

export function CandleScene({
  onBlow,
  onStart,
  muted,
  onMute,
  onCustomize,
  hasCustomPhoto,
}: Props) {
  const [blowing, setBlowing] = useState(false);
  const raf = useRef<number | null>(null);
  const start = useRef(0);
  const [frame, setFrame] = useState(candleFrame(0));
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const blow = () => {
    if (blowing) return;
    setBlowing(true);
    onStart();
    start.current = performance.now();
    const loop = (now: number) => {
      const p = Math.min(1, (now - start.current) / 1300);
      setFrame(candleFrame(p));
      if (p < 1) raf.current = requestAnimationFrame(loop);
      else onBlow();
    };
    raf.current = requestAnimationFrame(loop);
  };

  return (
    <section className={`candle-scene ${blowing ? 'is-blown' : ''}`} aria-label="Make a wish">
      <div className="candle-light" style={{ opacity: frame.glow }} />
      <div className="table" />

      <header className="wish">
        <h1>Make a wish</h1>
        <p>Quietly in your mind. Then blow out the candle.</p>
      </header>

      <button className="candle-hit" onClick={blow} disabled={blowing} aria-label="Blow out candle">
        <svg viewBox="0 0 200 350" className="candle-svg" aria-hidden="true">
          <defs>
            <radialGradient id="flame" cx=".5" cy=".78" r=".62">
              <stop offset="0" stopColor="#fffbe8" />
              <stop offset=".3" stopColor="#ffe6a3" />
              <stop offset=".62" stopColor="#ffab55" />
              <stop offset="1" stopColor="#ff6a2a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="halo" cx=".5" cy=".5" r=".5">
              <stop offset="0" stopColor="#ffcf8a" stopOpacity=".55" />
              <stop offset="1" stopColor="#ffcf8a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="wax" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3b0915" />
              <stop offset=".22" stopColor="#7a1c31" />
              <stop offset=".42" stopColor="#ab4458" />
              <stop offset=".62" stopColor="#7d1f33" />
              <stop offset="1" stopColor="#350812" />
            </linearGradient>
            <linearGradient id="wax-glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff9f7a" stopOpacity=".55" />
              <stop offset="1" stopColor="#ff9f7a" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="brass" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#5c3f1c" />
              <stop offset=".3" stopColor="#c79a52" />
              <stop offset=".45" stopColor="#f0d49a" />
              <stop offset=".7" stopColor="#a87a3c" />
              <stop offset="1" stopColor="#4a3216" />
            </linearGradient>
          </defs>

          <ellipse cx="100" cy="342" rx="86" ry="7" fill="#12040a" opacity=".55" />

          {/* Candle holder */}
          <path d="M178 322 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0" fill="none" stroke="url(#brass)" strokeWidth="4.5" />
          <ellipse cx="100" cy="330" rx="76" ry="13" fill="url(#brass)" />
          <ellipse cx="100" cy="327" rx="70" ry="9.5" fill="#6d4b22" />
          <ellipse cx="100" cy="326" rx="66" ry="8" fill="url(#brass)" opacity=".9" />
          <path d="M80 293 L120 293 L117 322 Q100 328 83 322 Z" fill="url(#brass)" />
          <ellipse cx="100" cy="293" rx="20" ry="4.5" fill="#d8b373" />

          {/* Candle */}
          <path d="M87 104 L84.5 294 L115.5 294 L113 104 Z" fill="url(#wax)" />
          <path d="M87 104 L86.2 160 L113.8 160 L113 104 Z" fill="url(#wax-glow)" style={{ opacity: frame.glow }} />
          <ellipse cx="100" cy="104" rx="13" ry="3.4" fill="#952f45" />
          <ellipse cx="100" cy="104.4" rx="9" ry="2.2" fill="#b2485d" />
          <path d="M87.2 105 Q85.6 122 86.4 136 Q87.4 143 89 136 L89.6 108 Z" fill="#8c2a3f" />
          <path d="M110.6 106 L111 152 Q112.4 161 114 152 Q114.6 128 112.9 105.5 Z" fill="#7f2236" />

          {/* Wick */}
          <path d="M100 104 Q98.8 95 100.8 88" stroke="#1b1012" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="100.8" cy="88.4" r="1.4" fill="#ff8b3d" style={{ opacity: Math.max(0.2, frame.glow) }} />

          {/* Flame: outer halo, flick, blue core, highlight */}
          <g style={{ transformOrigin: '100px 100px', transform: `translateX(${frame.flameSkew * 0.4}px) skewX(${-frame.flameSkew * 1.2}deg) scale(${0.7 + frame.flameScale * 0.3}, ${frame.flameScale})`, opacity: frame.flameScale }}>
            <ellipse cx="100" cy="70" rx="44" ry="54" fill="url(#halo)" />
            <g className="flame-flicker">
              <path d="M100 101 C87.5 100 84 86 88 74 C92 62 98 52 100 30 C103 52 109.5 62 112.6 74 C116 86 112.5 100 100 101 Z" fill="url(#flame)" />
              <ellipse cx="100" cy="94" rx="5.4" ry="7.5" fill="#6f8ff0" opacity=".45" />
              <path d="M100 97 C95 96 94.4 88 96.4 82 C98 77 99.4 72 100 64 C100.8 72 102.2 77 103.6 82 C105.6 88 105 96 100 97 Z" fill="#fffef4" opacity=".9" />
            </g>
          </g>

          {frame.smoke > 0 && (
            <g className="smoke" style={{ opacity: Math.min(1, frame.smoke * 1.6) }}>
              <path d="M100.8 88 C95 74 108 64 100 50 C93 38 106 26 99 8" />
              <path d="M100.8 88 C106 76 94 66 102 52 C108 42 97 30 104 14" />
              <path d="M100.8 88 C97 78 103 70 98 60 C94 50 101 40 97 28" />
            </g>
          )}
        </svg>
      </button>

      <button className="text-button blow-button" onClick={blow} disabled={blowing}>
        {blowing ? 'Wish made' : 'Blow out candle'}
      </button>

      <div className="candle-topbar">
        <button
          type="button"
          className="sound-toggle"
          onClick={onMute}
          aria-pressed={!muted}
        >
          {muted ? 'Sound: Off' : 'Sound: On'}
        </button>
      </div>
    </section>
  );
}
