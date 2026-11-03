export interface CardConfig {
  birthdayName: string;
  birthdayMessage: string;
  secondaryMessage: string;
  signature: string;
  paintingDuration: number;
}

export const CONFIG = {
  portraitPath: './portrait.jpg',
  birthdayName: 'Ivet',
  birthdayMessage: 'Happy Birthday, my Queen!',
  secondaryMessage: 'May this year have 364 happy days and at least one wonderful - TODAY!!!',
  /** Painting signature. Empty string for no signature. */
  signature: `with all the best, always yours Egor`,
  /** Full duration of painting process in ms. Phases divide it proportionally. */
  paintingDuration: 10000,
  enableSound: true,
  confettiAmount: 120,
  devPlaceholder: true,
  /** Maximum canvas side in pixels. */
  maxImageDimension: 1100,
  particleDprCap: 1.75
} as const;

export const DEFAULT_CARD_CONFIG: CardConfig = {
  birthdayName: CONFIG.birthdayName,
  birthdayMessage: CONFIG.birthdayMessage,
  secondaryMessage: CONFIG.secondaryMessage,
  signature: CONFIG.signature,
  paintingDuration: CONFIG.paintingDuration,
};
