import test from 'node:test';
import assert from 'node:assert/strict';
import { formatImagePosition, objectPositionStyle, parseImagePosition, visibleRegion } from './imagePosition.js';

function assertRegion(
  actual: { left: number; top: number; width: number; height: number },
  expected: { left: number; top: number; width: number; height: number }
) {
  for (const key of ['left', 'top', 'width', 'height'] as const) {
    assert.ok(Math.abs(actual[key] - expected[key]) < 1e-9, `${key}: ${actual[key]} != ${expected[key]}`);
  }
}

test('stored values parse, and anything unusable falls back to the centre', () => {
  assert.deepEqual(parseImagePosition('0% 100%'), { x: 0, y: 100 });
  assert.deepEqual(parseImagePosition(' 50% 0% '), { x: 50, y: 0 });
  for (const bad of [undefined, null, '', 'top', '50%', '150% 0%', '-10% 20%', 42]) {
    assert.deepEqual(parseImagePosition(bad), { x: 50, y: 50 }, String(bad));
  }
  assert.equal(formatImagePosition(100, 0), '100% 0%');
});

test('the centre needs no inline style; other picks become object-position', () => {
  assert.equal(objectPositionStyle(undefined), undefined);
  assert.equal(objectPositionStyle('50% 50%'), undefined);
  assert.equal(objectPositionStyle('garbage'), undefined);
  assert.equal(objectPositionStyle('50% 0%'), '50% 0%');
});

test('a wide image in a square frame keeps its full height and loses its sides', () => {
  assertRegion(visibleRegion(600, 300, 1, '0% 50%'), { left: 0, top: 0, width: 0.5, height: 1 });
  assertRegion(visibleRegion(600, 300, 1, '50% 100%'), { left: 0.25, top: 0, width: 0.5, height: 1 });
  assertRegion(visibleRegion(600, 300, 1, '100% 0%'), { left: 0.5, top: 0, width: 0.5, height: 1 });
});

test('a tall image in a square frame keeps its full width and loses top and bottom', () => {
  assertRegion(visibleRegion(300, 900, 1, '50% 0%'), { left: 0, top: 0, width: 1, height: 1 / 3 });
  assertRegion(visibleRegion(300, 900, 1, '0% 50%'), { left: 0, top: 1 / 3, width: 1, height: 1 / 3 });
  assertRegion(visibleRegion(300, 900, 1, '100% 100%'), { left: 0, top: 2 / 3, width: 1, height: 1 / 3 });
});

test('an image that already matches the frame is shown whole, whatever the pick', () => {
  assertRegion(visibleRegion(400, 400, 1, '0% 0%'), { left: 0, top: 0, width: 1, height: 1 });
  assertRegion(visibleRegion(0, 400, 1, '0% 0%'), { left: 0, top: 0, width: 1, height: 1 });
});
