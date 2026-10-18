import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progressUpdateFor } from './progressUpdate';

test('on a route a late save can only move the position forward', () => {
  assert.deepEqual(progressUpdateFor({ lastActiveItemIndex: 3, totalItemsCompleted: 4, runningTotal: 120 }, 'map'), {
    $set: { completionStatus: 'in_progress', 'data.totalScore': 120 },
    $max: { lastActiveItemIndex: 3, totalItemsCompleted: 4 },
  });
  assert.deepEqual(progressUpdateFor({ itemResult: { itemIndex: 2 } }, 'story').$max, { lastActiveItemIndex: 2 });
});

test('spiders stations come in any order, so the position is set as sent', () => {
  assert.deepEqual(progressUpdateFor({ lastActiveItemIndex: 1, totalItemsCompleted: 5 }, 'spiders'), {
    $set: { completionStatus: 'in_progress', lastActiveItemIndex: 1, totalItemsCompleted: 5 },
  });
});

test('missing or broken numbers are left out instead of written', () => {
  assert.deepEqual(progressUpdateFor({ runningTotal: Infinity, totalItemsCompleted: 'x' }, 'map'), {
    $set: { completionStatus: 'in_progress' },
  });
});
