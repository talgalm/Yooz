export interface OrderScoringRules {
  firstAttemptPoints: number;
  retryPoints: number;
  speedBonus: boolean;
  timeLimitSeconds?: number;
  allowRetry?: boolean;
}

export const SPEED_BONUS_SHARE = 0.5;
export const HINT_PENALTY_SHARE = 0.25;
export const GOLF_BONUS_POINTS = 25;

export function placedCorrectly(cards: string[], correctOrder: string[]): boolean[] {
  return cards.map((card, i) => card === correctOrder[i]);
}

export function roundPoints(rules: OrderScoringRules, firstTry: boolean[], secondTry?: boolean[]): number {
  if (firstTry.length === 0) return 0;
  const firstValue = rules.firstAttemptPoints / firstTry.length;
  const retryValue = rules.retryPoints / firstTry.length;
  const earned = firstTry.reduce((sum, placed, i) => {
    if (placed) return sum + firstValue;
    return secondTry?.[i] ? sum + retryValue : sum;
  }, 0);
  return Math.round(earned);
}

function speedBonusApplies(rules: OrderScoringRules): boolean {
  return rules.speedBonus && typeof rules.timeLimitSeconds === 'number' && rules.timeLimitSeconds > 0;
}

export function speedBonusPoints(rules: OrderScoringRules, secondsLeft: number | null): number {
  if (!speedBonusApplies(rules) || secondsLeft === null) return 0;
  const share = Math.min(1, Math.max(0, secondsLeft / (rules.timeLimitSeconds as number)));
  return Math.round(rules.firstAttemptPoints * SPEED_BONUS_SHARE * share);
}

export function hintPenaltyPoints(rules: OrderScoringRules): number {
  return Math.round(rules.firstAttemptPoints * HINT_PENALTY_SHARE);
}

export function maxOrderScore(rules: OrderScoringRules, roundCount: number, golf: boolean): number {
  const bestSpeedBonus = speedBonusApplies(rules) ? Math.round(rules.firstAttemptPoints * SPEED_BONUS_SHARE) : 0;
  return roundCount * (rules.firstAttemptPoints + bestSpeedBonus) + (golf ? GOLF_BONUS_POINTS : 0);
}
