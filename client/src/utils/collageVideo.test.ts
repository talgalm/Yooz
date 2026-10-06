import test from 'node:test';
import assert from 'node:assert/strict';
import {
  customVideoProblem,
  formatSeconds,
  moveSlot,
  newSlot,
  photoForSlot,
  resizeSlot,
  slotFit,
  slotTimes,
  sortByStart,
  trimmedDuration,
} from './collageVideo';

const slot = { startSec: 2, endSec: 5, x: 0.2, y: 0.2, w: 0.4, h: 0.3 };

test('moving a slot keeps it inside the frame', () => {
  assert.deepEqual(moveSlot(slot, 0.1, -0.05), { ...slot, x: 0.3, y: 0.15 });
  assert.deepEqual(moveSlot(slot, 5, 5), { ...slot, x: 0.6, y: 0.7 });
  assert.deepEqual(moveSlot(slot, -5, -5), { ...slot, x: 0, y: 0 });
});

test('resizing pins the opposite corner and never goes below the minimum size', () => {
  assert.deepEqual(resizeSlot(slot, 'se', 0.1, 0.1), { ...slot, w: 0.5, h: 0.4 });
  assert.deepEqual(resizeSlot(slot, 'nw', 0.1, 0.1), { ...slot, x: 0.3, y: 0.3, w: 0.3, h: 0.2 });
  const tiny = resizeSlot(slot, 'se', -1, -1);
  assert.equal(tiny.w, 0.05);
  assert.equal(tiny.h, 0.05);
  assert.equal(resizeSlot(slot, 'ne', 2, -2).w, 0.8);
});

test('slot times stay inside the video and last at least half a second', () => {
  assert.deepEqual(slotTimes(slot, -1, 99, 10), { ...slot, startSec: 0, endSec: 10 });
  assert.deepEqual(slotTimes(slot, 4, 4, 10), { ...slot, startSec: 4, endSec: 4.5 });
  assert.deepEqual(slotTimes(slot, 9.9, 12, 10), { ...slot, startSec: 9.5, endSec: 10 });
});

test('a new slot is a centred portrait box lasting three seconds from the playhead', () => {
  const portrait = newSlot(2, 20, 1080, 1920);
  assert.equal(portrait.startSec, 2);
  assert.equal(portrait.endSec, 5);
  assert.ok(Math.abs((portrait.h * 1920) / (portrait.w * 1080) - 4 / 3) < 0.01);
  assert.ok(Math.abs(portrait.x + portrait.w / 2 - 0.5) < 0.001);
  const landscape = newSlot(19, 20, 1920, 1080);
  assert.ok(landscape.h <= 0.8);
  assert.equal(landscape.endSec, 20);
});

test('slots read in the order they appear', () => {
  const later = { ...slot, startSec: 8, endSec: 9 };
  assert.deepEqual(sortByStart([later, slot]), [slot, later]);
});

test('extra slots reuse photos, and the fit is reported for the admin', () => {
  assert.deepEqual([0, 1, 2, 3].map((i) => photoForSlot(i, 3)), [0, 1, 2, 0]);
  assert.equal(slotFit(3, 3), 'match');
  assert.equal(slotFit(3, 5), 'reuse');
  assert.equal(slotFit(5, 3), 'unused');
  assert.equal(slotFit(3, 0), 'none');
});

test('fewer photos cut a built-in video one second after the last one', () => {
  assert.equal(trimmedDuration([5.7, 10.23, 14.27, 20.1, 25.43, 32.73], 3, 32.733), 15.27);
  assert.equal(trimmedDuration([5.7, 10.23], 2, 11), 11);
});

test('times read as minutes, seconds and tenths', () => {
  assert.equal(formatSeconds(4.25), '0:04.3');
  assert.equal(formatSeconds(75.04), '1:15.0');
});

test('a custom video is ready only with a loaded, short enough video and at least one slot', () => {
  assert.equal(customVideoProblem(undefined), 'noVideo');
  const video = { url: 'https://x/v.mp4', width: 1080, height: 1920, duration: 20, slots: [slot] };
  assert.equal(customVideoProblem(video), null);
  assert.equal(customVideoProblem({ ...video, width: 0 }), 'loading');
  assert.equal(customVideoProblem({ ...video, duration: 120 }), 'tooLong');
  assert.equal(customVideoProblem({ ...video, slots: [] }), 'noSlots');
});
