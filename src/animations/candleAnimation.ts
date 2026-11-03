export type CandleFrame = { flameScale: number; flameSkew: number; smoke: number; glow: number };

/**
 * Задувание: пламя сначала отклоняется и вытягивается от потока воздуха,
 * пару раз пытается выпрямиться, затем гаснет; после этого идёт дым.
 */
export function candleFrame(t: number): CandleFrame {
  const p = Math.max(0, Math.min(1, t));
  const gust = Math.sin(Math.min(1, p / 0.55) * Math.PI);
  const out = Math.max(0, Math.min(1, (p - 0.32) / 0.3));
  const fight = Math.sin(p * Math.PI * 9) * (1 - out) * 4;
  return {
    flameScale: Math.max(0, (1 + gust * 0.12) * (1 - out)),
    flameSkew: gust * 16 + fight,
    smoke: Math.max(0, (p - 0.5) / 0.5),
    glow: Math.max(0.08, 1 - out * 0.95)
  };
}
