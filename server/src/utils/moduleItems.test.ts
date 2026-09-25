import test from 'node:test';
import assert from 'node:assert/strict';
import {
  visibleOrderedIndices,
  nextIncompleteIndex,
  sanitizeLocation,
  sanitizeProximityMeters,
  sanitizeGroupOrders,
} from './moduleItems';

const items = (...groups: (string[] | undefined)[]) =>
  ({ items: groups.map((g) => ({ groups: g })) }) as never;

test('no groups configured: everything, in stored order', () => {
  assert.deepEqual(visibleOrderedIndices(items(undefined, undefined, undefined)), [0, 1, 2]);
});

test('group-restricted items are hidden from other groups', () => {
  const m = items(undefined, ['red'], ['blue']);
  assert.deepEqual(visibleOrderedIndices(m, 'red'), [0, 1]);
  assert.deepEqual(visibleOrderedIndices(m, 'blue'), [0, 2]);
  assert.deepEqual(visibleOrderedIndices(m), [0, 1, 2]);
});

test('groupOrders rearranges, per group', () => {
  const m = { ...(items(undefined, undefined, undefined) as object), groupOrders: { red: [2, 0, 1] } } as never;
  assert.deepEqual(visibleOrderedIndices(m, 'red'), [2, 0, 1]);
  assert.deepEqual(visibleOrderedIndices(m, 'blue'), [0, 1, 2]);
});

test('a stale order degrades instead of losing stations', () => {
  const m = {
    ...(items(undefined, undefined, undefined) as object),
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

test('a station location keeps real coordinates and a trimmed address', () => {
  assert.deepEqual(sanitizeLocation({ lat: 32.1, lng: 34.8, address: '  Yarkon Park ' }), { lat: 32.1, lng: 34.8, address: 'Yarkon Park' });
  assert.deepEqual(sanitizeLocation({ lat: 0, lng: 0, address: '   ' }), { lat: 0, lng: 0 });
});

test('a station location without usable coordinates is dropped, not guessed', () => {
  assert.equal(sanitizeLocation(undefined), undefined);
  assert.equal(sanitizeLocation({ lat: '32.1', lng: 34.8 }), undefined);
  assert.equal(sanitizeLocation({ lat: Number.NaN, lng: 34.8 }), undefined);
  assert.equal(sanitizeLocation({ lat: 91, lng: 34.8 }), undefined);
  assert.equal(sanitizeLocation({ lat: 32.1 }), undefined);
});

test('the opening radius is clamped to what the admin form allows', () => {
  assert.equal(sanitizeProximityMeters(10), 10);
  assert.equal(sanitizeProximityMeters(1), 5);
  assert.equal(sanitizeProximityMeters(999), 200);
  assert.equal(sanitizeProximityMeters(12.4), 12);
  assert.equal(sanitizeProximityMeters('10'), undefined);
  assert.equal(sanitizeProximityMeters(Number.POSITIVE_INFINITY), undefined);
});

test('team orders keep only real, distinct station indices', () => {
  assert.deepEqual(sanitizeGroupOrders({ red: [2, 0, 1] }, 3), { red: [2, 0, 1] });
  assert.deepEqual(sanitizeGroupOrders({ red: [2, 2, 7, -1, 1.5, 0] }, 3), { red: [2, 0] });
  assert.deepEqual(sanitizeGroupOrders({ red: [], blue: 'x', '': [0], $where: [0], green: [1] }, 3), { green: [1] });
  assert.equal(sanitizeGroupOrders({ red: [] }, 3), undefined);
  assert.equal(sanitizeGroupOrders([[0]], 3), undefined);
  assert.equal(sanitizeGroupOrders(null, 3), undefined);
});
