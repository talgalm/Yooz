export interface ArStationSettings {
  title: string;
  instructions: string;
  coinCount: number;
  timeLimitSeconds: number;
  areaRadiusMeters: number;
  pointsPerCoin: number;
  allCoinsBonus: number;
  finishText: string;
}

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

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
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
    coinCount: AR_COIN_COUNT.fallback,
    timeLimitSeconds: AR_TIME_LIMIT_SECONDS.fallback,
    areaRadiusMeters: AR_AREA_RADIUS_METERS.fallback,
    pointsPerCoin: AR_POINTS_PER_COIN.fallback,
    allCoinsBonus: AR_ALL_COINS_BONUS.fallback,
    finishText: '',
  };
}

export function arSettingsFrom(raw: unknown): ArStationSettings {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    title: asText(source.title),
    instructions: asText(source.instructions),
    coinCount: clampToRange(source.coinCount, AR_COIN_COUNT),
    timeLimitSeconds: clampToRange(source.timeLimitSeconds, AR_TIME_LIMIT_SECONDS),
    areaRadiusMeters: clampToRange(source.areaRadiusMeters, AR_AREA_RADIUS_METERS),
    pointsPerCoin: clampToRange(source.pointsPerCoin, AR_POINTS_PER_COIN),
    allCoinsBonus: clampToRange(source.allCoinsBonus, AR_ALL_COINS_BONUS),
    finishText: asText(source.finishText),
  };
}

export function arSettingsToSave(settings: ArStationSettings): ArStationSettings {
  const parsed = arSettingsFrom(settings);
  return {
    ...parsed,
    title: parsed.title.trim(),
    instructions: parsed.instructions.trim(),
    finishText: parsed.finishText.trim(),
  };
}

export interface ArScore {
  score: number;
  maxPossibleScore: number;
  bonus: number;
}

export function arScore(collected: number, settings: Pick<ArStationSettings, 'coinCount' | 'pointsPerCoin' | 'allCoinsBonus'>): ArScore {
  const got = Math.max(0, Math.min(settings.coinCount, collected));
  const bonus = got === settings.coinCount ? settings.allCoinsBonus : 0;
  return {
    score: got * settings.pointsPerCoin + bonus,
    maxPossibleScore: settings.coinCount * settings.pointsPerCoin + settings.allCoinsBonus,
    bonus,
  };
}
