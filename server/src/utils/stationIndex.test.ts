import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stationIndexFor, resultStationIndex, reportByStation } from './stationIndex';

const items = [{ ref: 'a' }, { ref: 'b' }, { ref: 'c' }, { ref: 'b' }] as never[];

test('a result is saved under its station, not its place in the route', () => {
  const module = { items, groupOrders: { Red: [2, 0, 1, 3] } };
  assert.equal(stationIndexFor(module, 'Red', 0, 'c'), 2);
  assert.equal(stationIndexFor(module, 'Red', 1, 'a'), 0);
  assert.equal(stationIndexFor(module, 'Blue', 0, 'a'), 0);
  assert.equal(stationIndexFor(module, undefined, 2, 'c'), 2);
});

test('when the route position and the station disagree, a unique station wins', () => {
  const module = { items, groupOrders: { Red: [2, 0, 1, 3] } };
  assert.equal(stationIndexFor(module, 'Red', 0, 'a'), 0);
  assert.equal(stationIndexFor(module, 'Red', 1, 'b'), 0);
  assert.equal(stationIndexFor(module, 'Red', 9, 'x'), undefined);
});

test('old results without a station index keep their item index', () => {
  assert.equal(resultStationIndex({ itemIndex: 3 }), 3);
  assert.equal(resultStationIndex({ itemIndex: 0, stationIndex: 2 }), 2);
  const report = reportByStation({ name: 'x', data: { totalScore: 5, itemResults: [{ itemIndex: 0, stationIndex: 2 }, { itemIndex: 1 }] } });
  assert.deepEqual(report.data.itemResults.map((r) => r.itemIndex), [2, 1]);
});
