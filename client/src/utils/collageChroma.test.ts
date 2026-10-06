import test from 'node:test';
import assert from 'node:assert/strict';
import { isKeyGreen, replaceKeyGreen } from './collageChroma';

test('the template green is keyed out, real-world greens and other colours are kept', () => {
  assert.equal(isKeyGreen(0x4f, 0xde, 0x69), true);
  assert.equal(isKeyGreen(70, 230, 90), true);
  assert.equal(isKeyGreen(60, 120, 40), false);
  assert.equal(isKeyGreen(255, 255, 255), false);
  assert.equal(isKeyGreen(249, 245, 50), false);
  assert.equal(isKeyGreen(0, 0, 0), false);
});

test('only keyed pixels take the photo layer, alpha untouched', () => {
  const frame = new Uint8ClampedArray([0x4f, 0xde, 0x69, 255, 10, 20, 30, 255]);
  const layer = new Uint8ClampedArray([200, 100, 50, 255, 1, 2, 3, 255]);
  replaceKeyGreen(frame, layer);
  assert.deepEqual([...frame], [200, 100, 50, 255, 10, 20, 30, 255]);
});

test('green with no photo behind it stays green, as in the real render', () => {
  const frame = new Uint8ClampedArray([0x4f, 0xde, 0x69, 255]);
  replaceKeyGreen(frame, new Uint8ClampedArray([0, 0, 0, 0]));
  assert.deepEqual([...frame], [0x4f, 0xde, 0x69, 255]);
});
