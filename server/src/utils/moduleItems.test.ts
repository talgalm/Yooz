import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleOrderedIndices, nextIncompleteIndex } from './moduleItems';

// Only the fields the helper reads — the real IModuleItem is much wider.
const items = (...groups: (string[] | undefined)[]) =>
  ({ items: groups.map((g) => ({ groups: g })) }) as never;

test('no groups configured: everything, in stored order', () => {
  assert.deepEqual(visibleOrderedIndices(items(undefined, undefined, undefined)), [0, 1, 2]);
});

test('group-restricted items are hidden from other groups', () => {
  const m = items(undefined, ['red'], ['blue']);
  assert.deepEqual(visibleOrderedIndices(m, 'red'), [0, 1]);
  assert.deepEqual(visibleOrderedIndices(m, 'blue'), [0, 2]);
  // Single-mode participant (no group) sees restricted items too — existing behaviour.
  assert.deepEqual(visibleOrderedIndices(m), [0, 1, 2]);
});

test('groupOrders rearranges, per group', () => {
  const m = { ...(items(undefined, undefined, undefined) as object), groupOrders: { red: [2, 0, 1] } } as never;
  assert.deepEqual(visibleOrderedIndices(m, 'red'), [2, 0, 1]);
  assert.deepEqual(visibleOrderedIndices(m, 'blue'), [0, 1, 2]); // no entry = stored order
});

test('a stale order degrades instead of losing stations', () => {
  const m = {
    ...(items(undefined, undefined, undefined) as object),
    // 7 was deleted, 1 is listed twice, 2 was added after the order was saved.
    groupOrders: { red: [7, 1, 1] },
  } as never;
  assert.deepEqual(visibleOrderedIndices(m, 'red'), [1, 0, 2]);
});

test('an order cannot smuggle in an item the group filter hid', () => {
  const m = { ...(items(undefined, ['blue']) as object), groupOrders: { red: [1, 0] } } as never;
  assert.deepEqual(visibleOrderedIndices(m, 'red'), [0]);
});

test('nextIncompleteIndex walks the gaps, then reports done', () => {
  assert.equal(nextIncompleteIndex([], 3), 0);
  assert.equal(nextIncompleteIndex([0, 2], 3), 1);
  assert.equal(nextIncompleteIndex([0, 1, 2], 3), 3);
});
