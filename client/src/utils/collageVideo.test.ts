import test from 'node:test';
import assert from 'node:assert/strict';
import {
  customVideoProblem,
  formatSeconds,
  formatShort,
  moveSlot,
  newSlot,
  outputAtSource,
  outputDuration,
  photoForSlot,
  resizeSlot,
  rulerStep,
  shiftSlot,
  slotLanes,
  slotFit,
  slotOpacityAt,
  slotTimes,
  sortByStart,
  sourceAt,
  stackOrder,
  trimmedDuration,
  withFreezeAdded,
  withFreezeHold,
  withFreezeRemoved,
  withLanesSettled,
  withLanesSwapped,
  withSlotAdded,
  withSlotOnLane,
  withTrim,
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
  assert.equal(formatShort(20), '0:20');
  assert.equal(formatShort(2.5), '0:02.5');
});

const clip = { url: 'https://x/v.mp4', width: 1080, height: 1920, duration: 20, slots: [slot] };

test('a custom video is ready only with a loaded, short enough video and at least one slot', () => {
  assert.equal(customVideoProblem(undefined), 'noVideo');
  assert.equal(customVideoProblem(clip), null);
  assert.equal(customVideoProblem({ ...clip, width: 0 }), 'loading');
  assert.equal(customVideoProblem({ ...clip, duration: 120 }), 'tooLong');
  assert.equal(customVideoProblem({ ...clip, duration: 120, trimEnd: 30 }), null);
  assert.equal(customVideoProblem({ ...clip, duration: 400, trimEnd: 30 }), 'sourceTooLong');
  assert.equal(customVideoProblem({ ...clip, slots: [] }), 'noSlots');
});

test('the final timeline maps back to the source, through trims and freezes', () => {
  const video = { ...clip, trimStart: 2, trimEnd: 12, freezes: [{ atSec: 5, holdSec: 3 }] };
  assert.equal(outputDuration(video), 13);
  assert.deepEqual(sourceAt(video, 1), { src: 3, frozen: false });
  assert.deepEqual(sourceAt(video, 4), { src: 5, frozen: true });
  assert.deepEqual(sourceAt(video, 7), { src: 6, frozen: false });
  assert.deepEqual(sourceAt(video, 99), { src: 12, frozen: false });
  assert.equal(outputAtSource(video, 8), 9);
  assert.equal(outputAtSource(video, 1), null);
});

test('a freeze pushes later photos along with their content and removing it pulls them back', () => {
  const video = { ...clip, slots: [{ ...slot, startSec: 2, endSec: 4 }, { ...slot, startSec: 8, endSec: 10 }] };
  const frozen = withFreezeAdded(video, 6, 6);
  assert.deepEqual(frozen.freezes, [{ atSec: 6, holdSec: 2 }]);
  assert.deepEqual(frozen.slots.map((s) => [s.startSec, s.endSec]), [[2, 4], [10, 12]]);
  const longer = withFreezeHold(frozen, 0, 5);
  assert.deepEqual(longer.slots.map((s) => [s.startSec, s.endSec]), [[2, 4], [13, 15]]);
  const removed = withFreezeRemoved(longer, 0);
  assert.equal(removed.freezes?.length, 0);
  assert.deepEqual(removed.slots.map((s) => [s.startSec, s.endSec]), [[2, 4], [8, 10]]);
});

test('a second freeze at the same moment is ignored', () => {
  const frozen = withFreezeAdded(clip, 6, 6);
  assert.equal(withFreezeAdded(frozen, 6.01, 6), frozen);
});

test('trimming the start moves photos with the content, trimming the end keeps them inside', () => {
  const video = { ...clip, slots: [{ ...slot, startSec: 5, endSec: 8 }, { ...slot, startSec: 15, endSec: 19 }] };
  const trimmed = withTrim(video, 3, 12);
  assert.equal(trimmed.trimStart, 3);
  assert.equal(trimmed.trimEnd, 12);
  assert.deepEqual(trimmed.slots.map((s) => [s.startSec, s.endSec]), [[2, 5], [8.5, 9]]);
});

test('photos that overlap in time go on separate timeline rows, the rest share one', () => {
  const at = (startSec: number, endSec: number) => ({ ...slot, startSec, endSec });
  assert.deepEqual(slotLanes([at(0, 3), at(2, 5), at(3, 6), at(5.5, 8)]), [0, 1, 0, 1]);
  assert.deepEqual(slotLanes([]), []);
});

test('the top timeline row is in front, and a chosen row is kept', () => {
  const at = (startSec: number, endSec: number, track?: number) => ({ ...slot, startSec, endSec, track });
  const slots = [at(0, 4, 1), at(2, 6, 0), at(7, 9)];
  assert.deepEqual(slotLanes(slots), [1, 0, 0]);
  assert.deepEqual(stackOrder(slots), [0, 1, 2]);
  assert.deepEqual(slotLanes([at(0, 4, 3), at(2, 6, 7)]), [0, 1]);
});

test('swapping rows or dragging a photo to another row changes which photo is in front', () => {
  const at = (startSec: number, endSec: number) => ({ ...slot, startSec, endSec });
  const slots = [at(0, 4), at(2, 6), at(5, 9)];
  assert.deepEqual(slotLanes(slots), [0, 1, 0]);
  assert.deepEqual(slotLanes(withLanesSwapped(slots, 0, 1)), [1, 0, 1]);
  assert.deepEqual(slotLanes(withSlotOnLane(slots, 1, 0)), [1, 0, 1]);
  assert.deepEqual(slotLanes(withSlotOnLane(slots, 0, 2)), [2, 1, 0]);
  assert.equal(withSlotOnLane(slots, 0, 0), slots);
});

test('a photo moved onto a busy row drops to the next free one, and a new photo goes in front', () => {
  const at = (startSec: number, endSec: number, track?: number) => ({ ...slot, startSec, endSec, track });
  assert.deepEqual(slotLanes(withLanesSettled([at(0, 4, 0), at(3, 6, 0)], 1)), [0, 1]);
  assert.deepEqual(slotLanes(withLanesSettled([at(0, 4, 0), at(3, 6, 0)], 0)), [1, 0]);
  const added = withSlotAdded([at(0, 4, 0), at(8, 9, 0)], at(2, 5));
  assert.deepEqual(slotLanes(added), [1, 1, 0]);
  assert.deepEqual(slotLanes(withSlotAdded([at(0, 4, 0)], at(5, 7))), [0, 0]);
});

test('the ruler picks a step that keeps its labels apart', () => {
  assert.equal(rulerStep(10, 600), 1);
  assert.equal(rulerStep(60, 600), 10);
  assert.equal(rulerStep(5, 1200), 0.5);
  assert.equal(rulerStep(0, 600), 1);
});

test('moving a photo in time keeps its length and stays inside the video', () => {
  assert.deepEqual(shiftSlot(slot, 2, 10), { ...slot, startSec: 4, endSec: 7 });
  assert.deepEqual(shiftSlot(slot, 20, 10), { ...slot, startSec: 7, endSec: 10 });
  assert.deepEqual(shiftSlot(slot, -9, 10), { ...slot, startSec: 0, endSec: 3 });
});

test('a photo fades in and out over a quarter second', () => {
  assert.equal(slotOpacityAt(slot, 1.9), 0);
  assert.equal(slotOpacityAt(slot, 2.125), 0.5);
  assert.equal(slotOpacityAt(slot, 3.5), 1);
  assert.equal(slotOpacityAt(slot, 5), 0);
});
