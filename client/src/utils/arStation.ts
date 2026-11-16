export type ArHuntMode = 'coins' | 'suitcase';
export type ArHints = 'map' | 'hotCold' | 'none';

export interface ArStationSettings {
  title: string;
  instructions: string;
  mode: ArHuntMode;
  showMap: boolean;
  hotCold: boolean;
  coinCount: number;
  timeLimitSeconds: number;
  areaRadiusMeters: number;
  pointsPerCoin: number;
  allCoinsBonus: number;
  findPoints: number;
  finishText: string;
  insideText: string;
  insideImageUrl: string;
  insideCode: string;
  riddleQuestion: string;
  riddleAnswers: string[];
  riddleCorrect: number;
  riddleBonus: number;
}

export interface ArRiddle {
  question: string;
  answers: string[];
  correct: number;
  bonus: number;
}

export interface ArRunResult {
  collected: number;
  riddleSolved: boolean;
}

export const AR_RIDDLE_ANSWER_SLOTS = 4;
export const AR_RIDDLE_MIN_ANSWERS = 2;

interface NumberRange {
  min: number;
  max: number;
  fallback: number;
}

export const AR_COIN_COUNT: NumberRange = { min: 3, max: 20, fallback: 10 };
export const AR_TIME_LIMIT_SECONDS: NumberRange = { min: 15, max: 300, fallback: 90 };
export const AR_AREA_RADIUS_METERS: NumberRange = { min: 2, max: 20, fallback: 5 };
export const AR_POINTS_PER_COIN: NumberRange = { min: 0, max: 1000, fallback: 10 };
export const AR_ALL_COINS_BONUS: NumberRange = { min: 0, max: 1000, fallback: 20 };
export const AR_FIND_POINTS: NumberRange = { min: 0, max: 1000, fallback: 50 };
export const AR_RIDDLE_BONUS: NumberRange = { min: 0, max: 1000, fallback: 30 };

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asAnswers(value: unknown): string[] {
  return Array.isArray(value) ? value.slice(0, AR_RIDDLE_ANSWER_SLOTS).map(asText) : [];
}

function asAnswerIndex(value: unknown): number {
  const index = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(index) && index >= 0 && index < AR_RIDDLE_ANSWER_SLOTS ? index : 0;
}

export function clampToRange(value: unknown, range: NumberRange): number {
  if (value === null || value === undefined || value === '') return range.fallback;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || (number === 0 && range.min > 0)) return range.fallback;
  return Math.min(range.max, Math.max(range.min, Math.round(number)));
}

export function emptyArSettings(): ArStationSettings {
  return {
    title: '',
    instructions: '',
    mode: 'coins',
    showMap: true,
    hotCold: true,
    coinCount: AR_COIN_COUNT.fallback,
    timeLimitSeconds: AR_TIME_LIMIT_SECONDS.fallback,
    areaRadiusMeters: AR_AREA_RADIUS_METERS.fallback,
    pointsPerCoin: AR_POINTS_PER_COIN.fallback,
    allCoinsBonus: AR_ALL_COINS_BONUS.fallback,
    findPoints: AR_FIND_POINTS.fallback,
    finishText: '',
    insideText: '',
    insideImageUrl: '',
    insideCode: '',
    riddleQuestion: '',
    riddleAnswers: [],
    riddleCorrect: 0,
    riddleBonus: AR_RIDDLE_BONUS.fallback,
  };
}

export function arSettingsFrom(raw: unknown): ArStationSettings {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    title: asText(source.title),
    instructions: asText(source.instructions),
    mode: source.mode === 'suitcase' ? 'suitcase' : 'coins',
    showMap: source.showMap !== false,
    hotCold: source.hotCold !== false,
    coinCount: clampToRange(source.coinCount, AR_COIN_COUNT),
    timeLimitSeconds: clampToRange(source.timeLimitSeconds, AR_TIME_LIMIT_SECONDS),
    areaRadiusMeters: clampToRange(source.areaRadiusMeters, AR_AREA_RADIUS_METERS),
    pointsPerCoin: clampToRange(source.pointsPerCoin, AR_POINTS_PER_COIN),
    allCoinsBonus: clampToRange(source.allCoinsBonus, AR_ALL_COINS_BONUS),
    findPoints: clampToRange(source.findPoints, AR_FIND_POINTS),
    finishText: asText(source.finishText),
    insideText: asText(source.insideText),
    insideImageUrl: asText(source.insideImageUrl),
    insideCode: asText(source.insideCode),
    riddleQuestion: asText(source.riddleQuestion),
    riddleAnswers: asAnswers(source.riddleAnswers),
    riddleCorrect: asAnswerIndex(source.riddleCorrect),
    riddleBonus: clampToRange(source.riddleBonus, AR_RIDDLE_BONUS),
  };
}

function filledAnswers(answers: string[], correct: number): { answers: string[]; correct: number } {
  const filled = answers.map((text, index) => ({ text: text.trim(), index })).filter((answer) => answer.text);
  return { answers: filled.map((answer) => answer.text), correct: filled.findIndex((answer) => answer.index === correct) };
}

export function arRiddle(
  settings: Pick<ArStationSettings, 'mode' | 'riddleQuestion' | 'riddleAnswers' | 'riddleCorrect' | 'riddleBonus'>,
): ArRiddle | null {
  if (settings.mode !== 'coins') return null;
  const question = settings.riddleQuestion.trim();
  const { answers, correct } = filledAnswers(settings.riddleAnswers, settings.riddleCorrect);
  if (!question || answers.length < AR_RIDDLE_MIN_ANSWERS || correct < 0) return null;
  return { question, answers, correct, bonus: settings.riddleBonus };
}

export function arSettingsToSave(settings: ArStationSettings): ArStationSettings {
  const parsed = arSettingsFrom(settings);
  return {
    ...parsed,
    title: parsed.title.trim(),
    instructions: parsed.instructions.trim(),
    finishText: parsed.finishText.trim(),
    insideText: parsed.insideText.trim(),
    insideImageUrl: parsed.insideImageUrl.trim(),
    insideCode: parsed.insideCode.trim(),
    riddleQuestion: parsed.riddleQuestion.trim(),
    riddleAnswers: parsed.riddleAnswers.map((answer) => answer.trim()),
  };
}

export function arHints(settings: Pick<ArStationSettings, 'showMap' | 'hotCold'>): ArHints {
  if (settings.showMap) return 'map';
  return settings.hotCold ? 'hotCold' : 'none';
}

export function hintsSettings(hints: ArHints): Pick<ArStationSettings, 'showMap' | 'hotCold'> {
  return { showMap: hints === 'map', hotCold: hints !== 'none' };
}

export function hasSuitcaseInside(settings: Pick<ArStationSettings, 'mode' | 'insideText' | 'insideImageUrl' | 'insideCode'>): boolean {
  return settings.mode === 'suitcase' && Boolean(settings.insideText.trim() || settings.insideImageUrl.trim() || settings.insideCode.trim());
}

export function arTargetCount(settings: Pick<ArStationSettings, 'mode' | 'coinCount'>): number {
  return settings.mode === 'suitcase' ? 1 : settings.coinCount;
}

export interface ArScore {
  score: number;
  maxPossibleScore: number;
  bonus: number;
  riddleBonus: number;
}

export function arScore(
  collected: number,
  settings: Pick<
    ArStationSettings,
    'mode' | 'coinCount' | 'pointsPerCoin' | 'allCoinsBonus' | 'findPoints' | 'riddleQuestion' | 'riddleAnswers' | 'riddleCorrect' | 'riddleBonus'
  >,
  riddleSolved = false,
): ArScore {
  if (settings.mode === 'suitcase') {
    return { score: collected > 0 ? settings.findPoints : 0, maxPossibleScore: settings.findPoints, bonus: 0, riddleBonus: 0 };
  }
  const got = Math.max(0, Math.min(settings.coinCount, collected));
  const bonus = got === settings.coinCount ? settings.allCoinsBonus : 0;
  const riddle = arRiddle(settings);
  const riddleBonus = riddle && riddleSolved ? riddle.bonus : 0;
  return {
    score: got * settings.pointsPerCoin + bonus + riddleBonus,
    maxPossibleScore: settings.coinCount * settings.pointsPerCoin + settings.allCoinsBonus + (riddle?.bonus ?? 0),
    bonus,
    riddleBonus,
  };
}
