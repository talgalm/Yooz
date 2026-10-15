import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hintPenaltyPoints, maxOrderScore, placedCorrectly, roundPoints, speedBonusPoints, type OrderScoringRules } from './orderScoring';

const rules: OrderScoringRules = { firstAttemptPoints: 100, retryPoints: 50, speedBonus: false };

test('each card in its place earns its share of the round', () => {
  const placed = placedCorrectly(['A', 'B', 'D', 'C', 'E'], ['A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(placed, [true, true, false, false, true]);
  assert.equal(roundPoints(rules, placed), 60);
  assert.equal(roundPoints(rules, [true, true, true, true, true]), 100);
  assert.equal(roundPoints(rules, [false, false, false]), 0);
  assert.equal(roundPoints(rules, []), 0);
});

test('a card fixed on the retry earns the retry share, and the retry can only add', () => {
  assert.equal(roundPoints(rules, [true, true, false, false, true], [true, true, true, true, true]), 80);
  assert.equal(roundPoints(rules, [true, true, false, false, true], [false, false, true, false, false]), 70);
  assert.equal(roundPoints(rules, [false, false], [true, true]), 50);
});

test('the speed bonus needs a time limit and shrinks with the clock', () => {
  assert.equal(speedBonusPoints({ ...rules, speedBonus: true, timeLimitSeconds: 60 }, 60), 50);
  assert.equal(speedBonusPoints({ ...rules, speedBonus: true, timeLimitSeconds: 60 }, 30), 25);
  assert.equal(speedBonusPoints({ ...rules, speedBonus: true, timeLimitSeconds: 60 }, 0), 0);
  assert.equal(speedBonusPoints({ ...rules, speedBonus: true }, 30), 0);
  assert.equal(speedBonusPoints({ ...rules, speedBonus: false, timeLimitSeconds: 60 }, 60), 0);
});

test('the maximum counts every bonus the game can give', () => {
  assert.equal(maxOrderScore(rules, 3, false), 300);
  assert.equal(maxOrderScore(rules, 3, true), 325);
  assert.equal(maxOrderScore({ ...rules, speedBonus: true, timeLimitSeconds: 60 }, 2, true), 325);
  assert.equal(maxOrderScore({ ...rules, speedBonus: true }, 2, false), 200);
});

test('a hint costs a quarter of a round', () => {
  assert.equal(hintPenaltyPoints(rules), 25);
  assert.equal(hintPenaltyPoints({ ...rules, firstAttemptPoints: 10 }), 3);
});
