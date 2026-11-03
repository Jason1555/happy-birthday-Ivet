export type AppState =
  | 'INTRO'
  | 'CANDLE'
  | 'BLOWING_CANDLE'
  | 'TRANSITION'
  | 'PAINTING'
  | 'FINAL_STROKE'
  | 'BIRTHDAY_MESSAGE'
  | 'CELEBRATION';

export type Point = { x: number; y: number };

export type RGB = [number, number, number];

/** Инструмент, которым кладётся мазок. Определяет и рендер, и вид кисти в руке. */
export type Tool = 'wash' | 'charcoal' | 'flat' | 'filbert' | 'round' | 'rigger' | 'glaze';

export type Stroke = {
  /** Точки в координатах холста (пиксели итогового canvas). */
  points: Point[];
  /** Накопленная длина пути до каждой точки — для равномерного движения кисти. */
  cum: number[];
  length: number;
  width: number;
  alpha: number;
  color: RGB;
  tool: Tool;
  seed: number;
  /** Для подписи: текст, который «пишется» вдоль мазка. */
  text?: { value: string; font: string; left: number; baseline: number };
};

export type PhaseId = 'ground' | 'sketch' | 'underpaint' | 'paint' | 'detail' | 'glaze' | 'signature';

export type Phase = {
  id: PhaseId;
  label: string;
  /** Доля общей длительности. */
  weight: number;
  strokes: Stroke[];
  /** Краски, которые художник набирает на палитру перед этапом. */
  paints: string[];
  /** Заходить ли кистью на палитру перед этапом. */
  visitPalette: boolean;
};

export type PortraitPlan = {
  width: number;
  height: number;
  ground: RGB;
  /** Фото в размере холста — источник прозрачных лессировок. */
  photo: HTMLCanvasElement;
  phases: Phase[];
  totalStrokes: number;
};
