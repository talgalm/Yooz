import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIRST_COIN_MAX_M,
  FIRST_COIN_SPREAD_RAD,
  NEAREST_START_M,
  REACH_TRACKED_M,
  SUITCASE_MIN_M,
  collectedCount,
  createArGame,
  createSuitcaseHunt,
  heatOf,
  inReach,
  isArGameOver,
  nearestCoin,
  pingIntervalSeconds,
  seededRandom,
  stepArGame,
  tryCollect,
} from './arGame';
import { AR_COIN_COUNT, arHints, arScore, arSettingsFrom, arSettingsToSave, arTargetCount, emptyArSettings, hasSuitcaseInside, hintsSettings } from './arStation';

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
    assert.ok(Math.abs(Math.atan2(first.x, -first.z)) <= FIRST_COIN_SPREAD_RAD + 1e-9);
  }
});

test('the same seed lays out the same coins', () => {
  assert.deepEqual(createArGame(10, start, ahead, 5, seededRandom(42)).coins, createArGame(10, start, ahead, 5, seededRandom(42)).coins);
});

test('walking up to a coin does not collect it, tapping it within reach does', () => {
  const game = stepArGame(createArGame(4, start, ahead, 5, seededRandom(3)), 2);
  const target = game.coins[1];
  const beside = { x: target.x + 0.2, z: target.z };
  assert.equal(collectedCount(stepArGame(game, 1)), 0);
  assert.equal(inReach(target, beside, REACH_TRACKED_M), true);
  const tapped = tryCollect(game, target.id, beside, REACH_TRACKED_M);
  assert.equal(tapped.collected, true);
  assert.equal(collectedCount(tapped.state), 1);
  assert.equal(tapped.state.coins[1].collectedAt, 2);
  assert.equal(tryCollect(tapped.state, target.id, beside, REACH_TRACKED_M).collected, false);
});

test('tapping a coin from too far away tells how far it is and collects nothing', () => {
  const game = createArGame(4, start, ahead, 5, seededRandom(3));
  const target = game.coins[2];
  const far = { x: target.x + 3, z: target.z };
  const tapped = tryCollect(game, target.id, far, REACH_TRACKED_M);
  assert.equal(tapped.collected, false);
  assert.ok(Math.abs(tapped.meters - 3) < 1e-9);
  assert.equal(collectedCount(tapped.state), 0);
});

test('the suitcase hides alone, out of arm reach, somewhere in the play area', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const hunt = createSuitcaseHunt(start, 6, seededRandom(seed));
    assert.equal(hunt.coins.length, 1);
    assert.ok(fromStart(hunt.coins[0]) >= SUITCASE_MIN_M - 1e-9);
    assert.ok(fromStart(hunt.coins[0]) <= 6);
  }
  const tight = createSuitcaseHunt(start, 2, seededRandom(9));
  assert.ok(fromStart(tight.coins[0]) >= SUITCASE_MIN_M - 1e-9);
});

test('the nearest coin skips the collected ones', () => {
  const game = createArGame(3, start, ahead, 5, seededRandom(8));
  const first = nearestCoin(game, start);
  assert.ok(first);
  const taken = { ...game, coins: game.coins.map((coin) => (coin.id === first.coin.id ? { ...coin, collectedAt: 1 } : coin)) };
  assert.notEqual(nearestCoin(taken, start)?.coin.id, first.coin.id);
  assert.equal(nearestCoin({ ...game, coins: game.coins.map((coin) => ({ ...coin, collectedAt: 1 })) }, start), null);
});

test('the game ends when the time runs out or the last target is collected', () => {
  const game = createArGame(3, start, ahead, 5, seededRandom(5));
  assert.equal(isArGameOver(game, 30), false);
  assert.equal(isArGameOver(stepArGame(game, 30), 30), true);
  assert.equal(isArGameOver({ ...game, coins: game.coins.map((coin) => ({ ...coin, collectedAt: 2 })) }, 30), true);
});

test('coins score per coin plus a bonus for all of them, the suitcase scores once when found', () => {
  const coins = { ...emptyArSettings(), coinCount: 10, pointsPerCoin: 10, allCoinsBonus: 20 };
  assert.deepEqual(arScore(7, coins), { score: 70, maxPossibleScore: 120, bonus: 0 });
  assert.deepEqual(arScore(10, coins), { score: 120, maxPossibleScore: 120, bonus: 20 });
  assert.equal(arScore(14, coins).score, 120);
  const suitcase = { ...coins, mode: 'suitcase' as const, findPoints: 60 };
  assert.deepEqual(arScore(1, suitcase), { score: 60, maxPossibleScore: 60, bonus: 0 });
  assert.equal(arScore(0, suitcase).score, 0);
  assert.equal(arTargetCount(suitcase), 1);
  assert.equal(arTargetCount(coins), 10);
});

test('settings fall back to sensible values and keep within their ranges', () => {
  const parsed = arSettingsFrom({ coinCount: 999, timeLimitSeconds: '0', areaRadiusMeters: 1, pointsPerCoin: 0, title: 7, mode: 'boat', showMap: 'no' });
  assert.equal(parsed.coinCount, AR_COIN_COUNT.max);
  assert.equal(parsed.timeLimitSeconds, 90);
  assert.equal(parsed.areaRadiusMeters, 2);
  assert.equal(parsed.pointsPerCoin, 0);
  assert.equal(parsed.title, '');
  assert.equal(parsed.mode, 'coins');
  assert.equal(parsed.showMap, true);
  assert.equal(arSettingsFrom({ mode: 'suitcase', showMap: false }).mode, 'suitcase');
  assert.equal(arSettingsFrom({ showMap: false }).showMap, false);
  assert.deepEqual(arSettingsFrom(undefined), emptyArSettings());
  const saved = arSettingsToSave({ ...emptyArSettings(), title: '  Coins  ', coinCount: 4.6 });
  assert.equal(saved.title, 'Coins');
  assert.equal(saved.coinCount, 5);
  assert.equal('coinMotion' in arSettingsToSave(arSettingsFrom({ coinMotion: 'fast' })), false);
});

test('hot-cold warms up as the player closes in and burns once the target is in reach', () => {
  assert.deepEqual(heatOf(1.2, REACH_TRACKED_M, 5), { closeness: 1, level: 'burning' });
  assert.equal(heatOf(3.4, REACH_TRACKED_M, 5).level, 'hot');
  assert.equal(heatOf(5, REACH_TRACKED_M, 5).level, 'warm');
  assert.equal(heatOf(8, REACH_TRACKED_M, 5).level, 'cold');
  assert.equal(heatOf(40, REACH_TRACKED_M, 5).closeness, 0);
  assert.ok(heatOf(3, REACH_TRACKED_M, 5).closeness > heatOf(4, REACH_TRACKED_M, 5).closeness);
  assert.ok(heatOf(2.4, REACH_TRACKED_M, 2).closeness < 1);
  assert.equal(pingIntervalSeconds(0), 1.5);
  assert.equal(pingIntervalSeconds(1), 0.3);
  assert.equal(pingIntervalSeconds(7), 0.3);
  assert.ok(pingIntervalSeconds(0.5) < pingIntervalSeconds(0.2));
});

test('hints read as map, hot-cold or none, and older stations keep the map', () => {
  assert.equal(arHints(arSettingsFrom({})), 'map');
  assert.equal(arHints(arSettingsFrom({ showMap: false })), 'hotCold');
  assert.equal(arHints(arSettingsFrom({ showMap: false, hotCold: false })), 'none');
  for (const hints of ['map', 'hotCold', 'none'] as const) assert.equal(arHints(hintsSettings(hints)), hints);
});

test('the suitcase has content inside only when something was filled in, and only in suitcase mode', () => {
  const suitcase = { ...emptyArSettings(), mode: 'suitcase' as const };
  assert.equal(hasSuitcaseInside(suitcase), false);
  assert.equal(hasSuitcaseInside({ ...suitcase, insideText: '   ' }), false);
  assert.equal(hasSuitcaseInside({ ...suitcase, insideCode: '4721' }), true);
  assert.equal(hasSuitcaseInside({ ...suitcase, mode: 'coins', insideCode: '4721' }), false);
  const saved = arSettingsToSave({ ...suitcase, insideText: '  Next clue  ', insideImageUrl: ' https://x/y.png ', insideCode: ' 47 ' });
  assert.deepEqual([saved.insideText, saved.insideImageUrl, saved.insideCode], ['Next clue', 'https://x/y.png', '47']);
  assert.equal(arSettingsFrom({ insideCode: 4721 }).insideCode, '');
});
