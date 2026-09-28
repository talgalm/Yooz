import test from 'node:test';
import assert from 'node:assert/strict';
import { offsetMeters } from './geo';
import { currentStepIndex, maneuverArrow, nextTurn, offRouteMeters, remainingWalk, type WalkRoute } from './walkNavigation';

const start = { lat: 32.08, lng: 34.78 };
const corner = offsetMeters(start, 200, 0);
const station = offsetMeters(corner, 0, 100);

const line = (from: typeof start, north: number, east: number, points = 10) =>
  Array.from({ length: points + 1 }, (_, i) => offsetMeters(from, (north * i) / points, (east * i) / points));

const route: WalkRoute = {
  distanceM: 300,
  durationS: 240,
  steps: [
    { instruction: 'Head north', distanceM: 200, durationS: 160, end: corner, path: line(start, 200, 0) },
    { instruction: 'Turn right onto Herzl', maneuver: 'turn-right', distanceM: 100, durationS: 80, end: station, path: line(corner, 0, 100) },
  ],
};

test('on the first leg, the next turn is the one at its end, counted down in metres', () => {
  const me = offsetMeters(start, 150, 0);
  assert.equal(currentStepIndex(route, me), 0);
  const turn = nextTurn(route, me);
  assert.equal(turn?.instruction, 'Turn right onto Herzl');
  assert.equal(turn?.maneuver, 'turn-right');
  assert.ok(Math.abs((turn?.inM ?? 0) - 50) < 2);
  assert.equal(turn?.arriving, false);
});

test('on the last leg, the next thing is arriving', () => {
  const me = offsetMeters(corner, 0, 60);
  assert.equal(currentStepIndex(route, me), 1);
  const turn = nextTurn(route, me);
  assert.equal(turn?.arriving, true);
  assert.ok(Math.abs((turn?.inM ?? 0) - 40) < 2);
});

test('what is left shrinks as you walk and is the whole route at the start', () => {
  const atStart = remainingWalk(route, start);
  assert.ok(Math.abs(atStart.distanceM - 300) < 2);
  assert.ok(Math.abs(atStart.durationS - 240) < 2);
  const halfway = remainingWalk(route, offsetMeters(start, 150, 0));
  assert.ok(Math.abs(halfway.distanceM - 150) < 2);
  assert.ok(Math.abs(halfway.durationS - 120) < 2);
});

test('walking off the route is measured from its nearest point', () => {
  assert.ok(offRouteMeters(route, offsetMeters(start, 100, 0)) < 1);
  assert.ok(Math.abs(offRouteMeters(route, offsetMeters(start, 100, 60)) - 60) < 2);
});

test('an unknown manoeuvre shows a straight arrow rather than nothing', () => {
  assert.equal(maneuverArrow('turn-left'), '←');
  assert.equal(maneuverArrow(undefined), '↑');
  assert.equal(maneuverArrow('ferry'), '↑');
});

test('an empty route gives no turn and nothing left', () => {
  const empty: WalkRoute = { steps: [], distanceM: 0, durationS: 0 };
  assert.equal(nextTurn(empty, start), null);
  assert.deepEqual(remainingWalk(empty, start), { distanceM: 0, durationS: 0 });
});
