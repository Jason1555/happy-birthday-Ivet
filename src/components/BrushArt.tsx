/**
 * Инструменты художника. Все нарисованы горизонтально, кончиком в точке (0, 20):
 * компонент кисти поворачивает их и ставит кончик ровно в точку мазка.
 * Цвет краски на кончике берётся из CSS-переменной --paint.
 */
export function BrushArt() {
  return (
    <svg className="brush-art" width="264" height="40" viewBox="0 0 264 40" aria-hidden="true">
      <defs>
        <linearGradient id="lacquer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a33a50" />
          <stop offset=".35" stopColor="#6e1a2c" />
          <stop offset="1" stopColor="#3b0a16" />
        </linearGradient>
        <linearGradient id="nickel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1ece3" />
          <stop offset=".45" stopColor="#a59f96" />
          <stop offset=".7" stopColor="#ddd6cb" />
          <stop offset="1" stopColor="#6c6660" />
        </linearGradient>
        <linearGradient id="hair" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c69a6a" />
          <stop offset="1" stopColor="#8a6040" />
        </linearGradient>
        <linearGradient id="beech" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2c095" />
          <stop offset="1" stopColor="#a87d4f" />
        </linearGradient>
      </defs>

      {/* Лакированная ручка — общая для круглых и плоских кистей */}
      <g className="handle">
        <path d="M70 14.8 C120 13.6 200 15.6 256 17.6 Q261 20 256 22.4 C200 24.4 120 26.4 70 25.2 Z" fill="url(#lacquer)" />
        <path d="M74 16.6 C130 15.8 200 17.2 250 18.6" stroke="rgba(255,220,220,.35)" strokeWidth="1" fill="none" />
        <path d="M92 15 L92 25" stroke="#c9a46a" strokeWidth="1.2" />
      </g>

      <g className="tool t-round">
        <path d="M2 20 C8 16.4 22 14.6 42 15 L42 25 C22 25.4 8 23.6 2 20 Z" fill="url(#hair)" />
        <path d="M2 20 C6 17.6 12 16.4 20 16.2 L20 23.8 C12 23.6 6 22.4 2 20 Z" className="paint" />
        <path d="M40 14.4 L72 14.4 L72 25.6 L40 25.6 Z" fill="url(#nickel)" />
        <path d="M64 14.4 L64 25.6" stroke="rgba(0,0,0,.25)" />
      </g>

      <g className="tool t-rigger">
        <path d="M0 20 C10 18.7 30 17.6 46 17.3 L46 22.7 C30 22.4 10 21.3 0 20 Z" fill="url(#hair)" />
        <path d="M0 20 C6 19.2 13 18.6 20 18.4 L20 21.6 C13 21.4 6 20.8 0 20 Z" className="paint" />
        <path d="M44 15.2 L72 14.4 L72 25.6 L44 24.8 Z" fill="url(#nickel)" />
      </g>

      <g className="tool t-filbert">
        <path d="M3 20 C3 15.2 8 13.2 16 13.2 L42 14 L42 26 L16 26.8 C8 26.8 3 24.8 3 20 Z" fill="url(#hair)" />
        <path d="M3 20 C3 15.6 7 13.6 13 13.4 L18 13.4 L18 26.6 L13 26.6 C7 26.4 3 24.4 3 20 Z" className="paint" />
        <path d="M40 13 L72 14.2 L72 25.8 L40 27 Z" fill="url(#nickel)" />
        <path d="M66 14 L66 26" stroke="rgba(0,0,0,.25)" />
      </g>

      <g className="tool t-flat">
        <path d="M1 11.5 L42 12.8 L42 27.2 L1 28.5 Z" fill="url(#hair)" />
        <path d="M1 11.5 L16 12 L16 28 L1 28.5 Z" className="paint" />
        <path d="M40 11.6 L72 14 L72 26 L40 28.4 Z" fill="url(#nickel)" />
        <path d="M58 13 L58 27 M64 13.5 L64 26.5" stroke="rgba(0,0,0,.22)" />
      </g>

      {/* Флейц для грунта: широкий, на деревянной лопатке */}
      <g className="tool t-wash">
        <path d="M1 4 L34 5.5 L34 34.5 L1 36 Z" fill="#e8dcc8" />
        <path d="M1 4 L13 4.6 L13 35.4 L1 36 Z" className="paint" />
        <path d="M34 7 L132 10 Q141 20 132 30 L34 33 Z" fill="url(#beech)" />
        <path d="M38 9 L38 31 M42 9 L42 31" stroke="#7d5a37" strokeDasharray="2 2" />
      </g>

      {/* Палочка угля */}
      <g className="tool t-charcoal">
        <path d="M0 20.5 L7 16.6 L128 15.4 Q131 16 130 19 L131 23.4 Q129 25 127 24.6 L7 24 Z" fill="#2c2527" />
        <path d="M10 17.2 L126 16.2" stroke="rgba(255,255,255,.18)" strokeWidth="1.2" />
        <path d="M40 17 L44 23.6 M88 16.4 L91 24" stroke="rgba(0,0,0,.45)" />
      </g>
    </svg>
  );
}
