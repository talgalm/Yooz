/**
 * Standalone self-check for the image-zoom transform math.
 * No test framework — run it directly:  npx tsx client/src/utils/zoomPan.check.ts
 */
import assert from 'assert';
import { clampPan, clampScale, distance, MAX_SCALE } from './zoomPan';

assert.strictEqual(clampScale(0.4), 1, 'never below 1× — the image must fill its frame');
assert.strictEqual(clampScale(99), MAX_SCALE, 'capped at MAX_SCALE');
assert.strictEqual(clampScale(2.5), 2.5, 'in-range scale is untouched');

// At 1× there is no overflow, so no panning is allowed at all.
assert.deepStrictEqual(clampPan(120, -80, 1, 300, 400), { x: 0, y: 0 }, 'no pan at 1x');

// At 2× a 300×400 image overflows by 150/200 on each side.
assert.deepStrictEqual(clampPan(500, 500, 2, 300, 400), { x: 150, y: 200 }, 'clamped to the overflow');
assert.deepStrictEqual(clampPan(-500, -500, 2, 300, 400), { x: -150, y: -200 }, 'clamped both ways');
assert.deepStrictEqual(clampPan(40, -30, 2, 300, 400), { x: 40, y: -30 }, 'in-range pan is untouched');

assert.strictEqual(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5, 'pinch distance');

console.log('zoomPan self-check passed');
