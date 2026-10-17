import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freeTarget, moveSkippingLocked } from './lockedReorder';

const none = [false, false, false, false];

test('without locks a move is the plain drag-and-drop move', () => {
  assert.deepEqual(moveSkippingLocked(['a', 'b', 'c', 'd'], none, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveSkippingLocked(['a', 'b', 'c', 'd'], none, 3, 1), ['a', 'd', 'b', 'c']);
  assert.equal(freeTarget(none, 1, 9), 3);
  assert.equal(freeTarget(none, 1, -4), 0);
});

test('locked cards never move, the others flow around them', () => {
  const locked = [false, true, false, true, false];
  assert.deepEqual(moveSkippingLocked(['a', 'L1', 'b', 'L3', 'c'], locked, 0, 4), ['b', 'L1', 'c', 'L3', 'a']);
  assert.deepEqual(moveSkippingLocked(['a', 'L1', 'b', 'L3', 'c'], locked, 4, 2), ['a', 'L1', 'c', 'L3', 'b']);
  assert.deepEqual(moveSkippingLocked(['a', 'L1', 'b'], [false, true, false], 1, 2), ['a', 'L1', 'b']);
});

test('dropping on a locked card lands past it, in the direction of the drag', () => {
  const locked = [false, true, false, true, false];
  assert.equal(freeTarget(locked, 0, 1), 2);
  assert.equal(freeTarget(locked, 4, 3), 2);
  assert.equal(freeTarget(locked, 2, 3), 4);
  assert.equal(freeTarget([false, true, true], 0, 2), 0);
});
