import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStepDetector } from './arSteps';

function countSteps(signal: (seconds: number) => number, seconds: number): number {
  const detector = createStepDetector();
  let steps = 0;
  for (let ms = 0; ms <= seconds * 1000; ms += 16) {
    if (detector.push(signal(ms / 1000), ms)) steps += 1;
  }
  return steps;
}

test('a walking bounce of two steps a second counts about two steps a second', () => {
  const steps = countSteps((s) => 9.81 + 3 * Math.sin(s * Math.PI * 2 * 2), 6);
  assert.ok(steps >= 10 && steps <= 13, `counted ${steps}`);
});

test('a phone held still counts no steps', () => {
  assert.equal(countSteps((s) => 9.81 + 0.2 * Math.sin(s * 37), 6), 0);
});

test('a single jolt counts one step, not a burst', () => {
  assert.equal(countSteps((s) => (s > 2 && s < 2.1 ? 14 : 9.81), 4), 1);
});
