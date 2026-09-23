import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitiseModuleItems, sanitiseMapFields, readItemLocation } from './moduleConfig';

const station = (extra: Record<string, unknown> = {}) => ({ type: 'station', ref: 'abc123', ...extra });

test('a placed pin survives the save', () => {
  const [item] = sanitiseModuleItems([station({ location: { lat: 32.0853, lng: 34.7818, address: 'רחוב הרצל 1' } })]);
  assert.deepEqual(item.location, { lat: 32.0853, lng: 34.7818, address: 'רחוב הרצל 1' });
});

test('a pin dropped on the map, with no address, is still a pin', () => {
  const [item] = sanitiseModuleItems([station({ location: { lat: 32.1, lng: 34.8 } })]);
  assert.deepEqual(item.location, { lat: 32.1, lng: 34.8 });
});

test('half a location is no location', () => {
  for (const half of [{ lat: 32.1 }, { lng: 34.8 }, { lat: '32.1', lng: '34.8' }, { lat: NaN, lng: 34.8 }, {}]) {
    assert.equal(readItemLocation(half), undefined);
  }
});

test('coordinates off the globe are refused', () => {
  assert.equal(readItemLocation({ lat: 91, lng: 34.8 }), undefined);
  assert.equal(readItemLocation({ lat: 32.1, lng: -181 }), undefined);
});

test('the other item fields still come through', () => {
  const [item] = sanitiseModuleItems([
    station({ groups: ['red'], isFinal: true, revisitable: true, spiderSvg: '/x.svg' }),
  ]);
  assert.deepEqual(item.groups, ['red']);
  assert.equal(item.isFinal, true);
  assert.equal(item.revisitable, true);
  assert.equal(item.spiderSvg, '/x.svg');
});

test('nothing else on the payload reaches the document', () => {
  const [item] = sanitiseModuleItems([station({ _id: 'nope', adminOnlyNote: 'nope' })]);
  assert.deepEqual(Object.keys(item).sort(), ['ref', 'type']);
});

test('items without a type or a ref are dropped', () => {
  assert.deepEqual(sanitiseModuleItems([{ type: 'station' }, { ref: 'x' }, { type: 'nope', ref: 'x' }]), []);
  assert.deepEqual(sanitiseModuleItems('not an array'), []);
});

test('map fields are kept for a map module', () => {
  const out = sanitiseMapFields('map', { groupOrders: { red: [2, 0, 1] }, proximityMeters: 25 });
  assert.deepEqual(out, { groupOrders: { red: [2, 0, 1] }, proximityMeters: 25 });
});

test('map fields are dropped for every other module type', () => {
  assert.deepEqual(sanitiseMapFields('story', { groupOrders: { red: [0] }, proximityMeters: 25 }), {});
  assert.deepEqual(sanitiseMapFields('spiders', { groupOrders: { red: [0] }, proximityMeters: 25 }), {});
});

test('a junk walking order is ignored, not stored', () => {
  const out = sanitiseMapFields('map', { groupOrders: { red: ['x', -1, 1.5], blue: [] } });
  assert.deepEqual(out, {});
});

test('the proximity radius has to be a positive number, and is capped', () => {
  assert.equal(sanitiseMapFields('map', { proximityMeters: 0 }).proximityMeters, undefined);
  assert.equal(sanitiseMapFields('map', { proximityMeters: -5 }).proximityMeters, undefined);
  assert.equal(sanitiseMapFields('map', { proximityMeters: 12.4 }).proximityMeters, 12);
  assert.equal(sanitiseMapFields('map', { proximityMeters: 99999 }).proximityMeters, 1000);
});
