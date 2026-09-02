import test from 'node:test';
import assert from 'node:assert/strict';
import { angleDelta, bearingDegrees, distanceMeters, offsetMeters } from './geo';

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
  assert.equal(Math.abs(angleDelta(0, 180)), 180); // exact opposite: either sign is fine
  assert.equal(angleDelta(90, 90), 0);
});
