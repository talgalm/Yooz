import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLLECT_RADIUS_TRACKED_M,
  FIRST_COIN_MAX_M,
  FIRST_COIN_SPREAD_RAD,
  NEAREST_START_M,
  collectedCount,
  createArGame,
  isArGameOver,
  nearestCoin,
  seededRandom,
  stepArGame,
} from './arGame';
import { AR_COIN_COUNT, arScore, arSettingsFrom, arSettingsToSave, emptyArSettings } from './arStation';

const start = { x: 0, z: 0 };
const ahead = { x: 0, z: -1 };
const fromStart = (spot: { x: number; z: number }) => Math.hypot(spot.x, spot.z);

test('coins spread around the player inside the play area, never on top of the start', () => {
  const game = createArGame(12, start, ahead, 5, seededRandom(7));
  assert.equal(game.coins.length, 12);
  for (const coin of game.coins) {
    assert.ok(fromStart(coin) >= NEAREST_START_M - 1e-9);
    assert.ok(fromStart(coin) <= 5);
  }
  const quadrants = new Set(game.coins.map((coin) => `${Math.sign(coin.x)}${Math.sign(coin.z)}`));
  assert.ok(quadrants.size >= 3);
});

test('the first coin waits close by, in the direction the phone faces', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const first = createArGame(8, start, ahead, 6, seededRandom(seed)).coins[0];
    assert.ok(fromStart(first) <= FIRST_COIN_MAX_M + 1e-9);
    const offFacing = Math.abs(Math.atan2(first.x, -first.z));
    assert.ok(offFacing <= FIRST_COIN_SPREAD_RAD + 1e-9);
  }
});

test('the same seed lays out the same coins', () => {
  assert.deepEqual(createArGame(10, start, ahead, 5, seededRandom(42)).coins, createArGame(10, start, ahead, 5, seededRandom(42)).coins);
});

test('walking up to a coin collects it once', () => {
  const game = createArGame(4, start, ahead, 5, seededRandom(3));
  const target = game.coins[1];
  const first = stepArGame(game, { x: target.x + 0.3, z: target.z }, 0.016, COLLECT_RADIUS_TRACKED_M);
  assert.deepEqual(first.collectedIds, [target.id]);
  assert.equal(collectedCount(first.state), 1);
  assert.deepEqual(stepArGame(first.state, { x: target.x, z: target.z }, 0.016, COLLECT_RADIUS_TRACKED_M).collectedIds, []);
  const far = stepArGame(game, { x: target.x + 1, z: target.z }, 0.016, COLLECT_RADIUS_TRACKED_M);
  assert.deepEqual(far.collectedIds, []);
});

test('the nearest coin skips the collected ones', () => {
  const game = createArGame(3, start, ahead, 5, seededRandom(8));
  const first = nearestCoin(game, start);
  assert.ok(first);
  const taken = { ...game, coins: game.coins.map((coin) => (coin.id === first.coin.id ? { ...coin, collectedAt: 1 } : coin)) };
  assert.notEqual(nearestCoin(taken, start)?.coin.id, first.coin.id);
  assert.equal(nearestCoin({ ...game, coins: game.coins.map((coin) => ({ ...coin, collectedAt: 1 })) }, start), null);
});

test('the game ends when the time runs out or the last coin is collected', () => {
  const game = createArGame(3, start, ahead, 5, seededRandom(5));
  assert.equal(isArGameOver(game, 30), false);
  assert.equal(isArGameOver({ ...game, elapsedSeconds: 30 }, 30), true);
  assert.equal(isArGameOver({ ...game, coins: game.coins.map((coin) => ({ ...coin, collectedAt: 2 })) }, 30), true);
});

test('points per coin, plus the bonus only for collecting all of them', () => {
  const settings = { coinCount: 10, pointsPerCoin: 10, allCoinsBonus: 20 };
  assert.deepEqual(arScore(7, settings), { score: 70, maxPossibleScore: 120, bonus: 0 });
  assert.deepEqual(arScore(10, settings), { score: 120, maxPossibleScore: 120, bonus: 20 });
  assert.equal(arScore(14, settings).score, 120);
});

test('settings fall back to sensible numbers and keep within their ranges', () => {
  assert.equal('coinMotion' in arSettingsToSave(arSettingsFrom({ coinMotion: 'fast' })), false);
  const parsed = arSettingsFrom({ coinCount: 999, timeLimitSeconds: '0', areaRadiusMeters: 1, pointsPerCoin: 0, title: 7 });
  assert.equal(parsed.coinCount, AR_COIN_COUNT.max);
  assert.equal(parsed.timeLimitSeconds, 90);
  assert.equal(parsed.areaRadiusMeters, 2);
  assert.equal(parsed.pointsPerCoin, 0);
  assert.equal(parsed.title, '');
  assert.deepEqual(arSettingsFrom(undefined), emptyArSettings());
  const saved = arSettingsToSave({ ...emptyArSettings(), title: '  Coins  ', coinCount: 4.6 });
  assert.equal(saved.title, 'Coins');
  assert.equal(saved.coinCount, 5);
});
