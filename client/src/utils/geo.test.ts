import test from 'node:test';
import assert from 'node:assert/strict';
import {
  angleDelta,
  bearingDegrees,
  distanceMeters,
  offsetMeters,
  effectiveDistance,
  hasArrived,
  DEFAULT_PROXIMITY_METERS,
  type Fix,
} from './geo';

const tlv = { lat: 32.0853, lng: 34.7818 };

test('offsetMeters round-trips through distance and bearing', () => {
  const north = offsetMeters(tlv, 100, 0);
  assert.ok(Math.abs(distanceMeters(tlv, north) - 100) < 1);
  assert.ok(Math.abs(bearingDegrees(tlv, north) - 0) < 1);

  const east = offsetMeters(tlv, 0, 50);
  assert.ok(Math.abs(distanceMeters(tlv, east) - 50) < 1);
  assert.ok(Math.abs(bearingDegrees(tlv, east) - 90) < 1);

  const southWest = offsetMeters(tlv, -30, -30);
  assert.ok(Math.abs(bearingDegrees(tlv, southWest) - 225) < 1);
});

test('angleDelta takes the short way around', () => {
  assert.equal(angleDelta(350, 10), 20);
  assert.equal(angleDelta(10, 350), -20);
  assert.equal(Math.abs(angleDelta(0, 180)), 180);
  assert.equal(angleDelta(90, 90), 0);
});

const station = offsetMeters(tlv, 0, 0);
const at = (north: number, east: number, accuracy: number): Fix => ({
  ...offsetMeters(station, north, east),
  accuracy,
});

test('a sloppy fix at the station still counts as arrived', () => {
  assert.ok(hasArrived(at(12, 0, 15), station));
  assert.ok(!hasArrived(at(12, 0, 2), station));
});

test('a junk fix never opens a station, and never closes one', () => {
  const junk = at(5, 0, 400);
  assert.ok(!hasArrived(junk, station));
  assert.ok(hasArrived(junk, station, DEFAULT_PROXIMITY_METERS, true));
});

test('forgiveness is capped, so one wide fix is not everywhere at once', () => {
  assert.equal(Math.round(effectiveDistance(at(200, 0, 200), station)), 175);
});

test('hysteresis keeps an opened station open while the fix jitters', () => {
  const edge = at(20, 0, 0);
  assert.ok(!hasArrived(edge, station, 10, false));
  assert.ok(hasArrived(edge, station, 10, true));
  assert.ok(!hasArrived(at(40, 0, 0), station, 10, true));
});
