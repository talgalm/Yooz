import test from 'node:test';
import assert from 'node:assert/strict';
import { offsetMeters } from './geo';
import { laterAtSamePlace, opensRightAfter, placeGroupEnd, placeOf } from './mapChain';

const square = { lat: 32.08, lng: 34.78 };
const park = offsetMeters(square, 300, 0);

test('a station with no location opens straight after the one before it', () => {
  const items = [{ location: square }, {}, { location: park }];
  assert.equal(opensRightAfter(items, 1), true);
  assert.equal(opensRightAfter(items, 2), false);
});

test('a station a few metres from the last place opens straight after it; a walk away does not', () => {
  const items = [{ location: square }, { location: offsetMeters(square, 8, 5) }, { location: park }];
  assert.equal(opensRightAfter(items, 1), true);
  assert.equal(opensRightAfter(items, 2), false);
});

test('the place carries through stations with no location', () => {
  const items = [{ location: square }, {}, {}, { location: offsetMeters(square, 5, 0) }, { location: park }];
  assert.equal(opensRightAfter(items, 3), true);
  assert.deepEqual(placeOf(items, 2), square);
  assert.equal(opensRightAfter(items, 4), false);
});

test('the first station never chains, even without a location', () => {
  assert.equal(opensRightAfter([{}, { location: square }], 0), false);
  assert.equal(opensRightAfter([{}, { location: square }], 1), false);
  assert.equal(placeOf([{}, {}], 1), undefined);
});

test('a place groups its first station with every station chained after it', () => {
  const items = [{ location: square }, {}, { location: offsetMeters(square, 4, 4) }, { location: park }, {}];
  assert.equal(placeGroupEnd(items, 0), 2);
  assert.equal(placeGroupEnd(items, 3), 4);
  assert.equal(placeGroupEnd([{ location: square }, { location: park }], 0), 0);
});

test('a later station of the same place is recognised, so its place shows one pin', () => {
  const items = [{ location: square }, {}, { location: offsetMeters(square, 4, 4) }, { location: park }];
  assert.equal(laterAtSamePlace(items, 0, 1), true);
  assert.equal(laterAtSamePlace(items, 0, 2), true);
  assert.equal(laterAtSamePlace(items, 0, 0), false);
  assert.equal(laterAtSamePlace(items, 0, 3), false);
});
