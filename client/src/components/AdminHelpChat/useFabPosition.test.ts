import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FAB_SIZE,
  clampFabPosition,
  defaultFabPosition,
  readStoredPosition,
} from './useFabPosition';

const desktop = { width: 1280, height: 800 };

test('keeps an in-bounds position untouched', () => {
  assert.deepEqual(clampFabPosition({ left: 400, top: 300 }, desktop), { left: 400, top: 300 });
});

test('pulls a position back inside the viewport', () => {
  assert.deepEqual(clampFabPosition({ left: -80, top: -40 }, desktop), { left: 12, top: 12 });
  assert.deepEqual(clampFabPosition({ left: 5000, top: 5000 }, desktop), {
    left: desktop.width - FAB_SIZE - 12,
    top: desktop.height - FAB_SIZE - 12,
  });
});

test('never returns a negative offset on a viewport smaller than the fab', () => {
  const tiny = { width: 40, height: 40 };
  const clamped = clampFabPosition({ left: 999, top: 999 }, tiny);
  assert.equal(clamped.left, 12);
  assert.equal(clamped.top, 12);
});

test('defaults to the bottom-left corner', () => {
  assert.deepEqual(defaultFabPosition(desktop), {
    left: 24,
    top: desktop.height - FAB_SIZE - 24,
  });
});

test('falls back to the default for missing or junk storage', () => {
  const fallback = defaultFabPosition(desktop);
  assert.deepEqual(readStoredPosition(null, desktop), fallback);
  assert.deepEqual(readStoredPosition('not json', desktop), fallback);
  assert.deepEqual(readStoredPosition('{"left":"x"}', desktop), fallback);
  assert.deepEqual(readStoredPosition('{"left":null,"top":null}', desktop), fallback);
});

test('clamps a stored position saved on a bigger screen', () => {
  const stored = JSON.stringify({ left: 1200, top: 700 });
  assert.deepEqual(readStoredPosition(stored, { width: 500, height: 500 }), {
    left: 500 - FAB_SIZE - 12,
    top: 500 - FAB_SIZE - 12,
  });
});
