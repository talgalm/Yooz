import test from 'node:test';
import assert from 'node:assert/strict';
import {
  angleDelta,
  bearingDegrees,
  distanceMeters,
  offsetMeters,
  effectiveDistance,
  hasArrived,
  reachMeters,
  DEFAULT_PROXIMITY_METERS,
  type Fix,
  pathMeters,
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

test('where the walking route ends next to the station counts as the station', () => {
  const walkEnd = offsetMeters(station, 30, 0);
  const atWalkEnd = { ...offsetMeters(station, 32, 0), accuracy: 3 };
  assert.ok(!hasArrived(atWalkEnd, station));
  assert.ok(hasArrived(atWalkEnd, station, DEFAULT_PROXIMITY_METERS, false, walkEnd));
  assert.equal(Math.round(reachMeters(atWalkEnd, station, walkEnd)), 2);
  const farWalkEnd = offsetMeters(station, 80, 0);
  const atFarWalkEnd = { ...offsetMeters(station, 80, 0), accuracy: 3 };
  assert.ok(!hasArrived(atFarWalkEnd, station, DEFAULT_PROXIMITY_METERS, false, farWalkEnd));
});

test('a distance on screen at or under the radius always opens the station', () => {
  for (const meters of [0, 4, 9, 10]) {
    const fix = { ...offsetMeters(station, meters, 0), accuracy: 2 };
    assert.ok(hasArrived(fix, station, 10), `${meters} m`);
  }
});

test('a path adds up its legs in order', () => {
  const a = { lat: 32, lng: 34.8 };
  const b = { lat: 32.001, lng: 34.8 };
  const c = { lat: 32.001, lng: 34.801 };
  assert.ok(Math.abs(pathMeters([a, b, c]) - (distanceMeters(a, b) + distanceMeters(b, c))) < 1e-6);
  assert.equal(pathMeters([a]), 0);
  assert.equal(pathMeters([]), 0);
});
