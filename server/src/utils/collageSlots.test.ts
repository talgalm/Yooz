import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CUSTOM_VIDEO_MAX_SECONDS,
  CUSTOM_VIDEO_MAX_SLOTS,
  SLOT_MIN_SECONDS,
  SLOT_MIN_SIZE,
  TRIMMED_TAIL_SECONDS,
  evenPixels,
  outputWidth,
  photoForSlot,
  sanitizeCustomCollageVideo,
  trimmedDuration,
  usedSceneCount,
} from './collageSlots';

const video = {
  url: 'https://res.cloudinary.com/demo/video/upload/clip.mp4',
  width: 1080,
  height: 1920,
  duration: 20,
  slots: [{ startSec: 2, endSec: 5, x: 0.1, y: 0.2, w: 0.5, h: 0.4 }],
};

test('a valid custom video is kept as it is', () => {
  assert.deepEqual(sanitizeCustomCollageVideo(video), video);
});

test('a custom video needs an http url, sane dimensions, a capped length and at least one slot', () => {
  assert.equal(sanitizeCustomCollageVideo({ ...video, url: 'javascript:alert(1)' }), undefined);
  assert.equal(sanitizeCustomCollageVideo({ ...video, width: 10 }), undefined);
  assert.equal(sanitizeCustomCollageVideo({ ...video, duration: CUSTOM_VIDEO_MAX_SECONDS + 1 }), undefined);
  assert.equal(sanitizeCustomCollageVideo({ ...video, slots: [] }), undefined);
  assert.equal(sanitizeCustomCollageVideo(null), undefined);
});

test('slots are pulled back inside the frame and the video length', () => {
  const clean = sanitizeCustomCollageVideo({
    ...video,
    slots: [{ startSec: -3, endSec: 99, x: 0.9, y: -1, w: 0.4, h: 2 }],
  });
  assert.deepEqual(clean?.slots, [{ startSec: 0, endSec: 20, x: 0.6, y: 0, w: 0.4, h: 1 }]);
});

test('a slot always lasts at least half a second and broken slots are dropped', () => {
  const clean = sanitizeCustomCollageVideo({
    ...video,
    slots: [{ startSec: 4, endSec: 4, x: 0, y: 0, w: 0.5, h: 0.5 }, { startSec: 'x' }],
  });
  assert.equal(clean?.slots.length, 1);
  assert.equal(clean?.slots[0].endSec, 4.5);
});

test('no more than the slot cap is kept', () => {
  const many = Array.from({ length: CUSTOM_VIDEO_MAX_SLOTS + 5 }, () => video.slots[0]);
  assert.equal(sanitizeCustomCollageVideo({ ...video, slots: many })?.slots.length, CUSTOM_VIDEO_MAX_SLOTS);
});

test('a built-in video uses one scene per photo, between one and all of them', () => {
  assert.equal(usedSceneCount(6, 3), 3);
  assert.equal(usedSceneCount(6, 9), 6);
  assert.equal(usedSceneCount(6, 0), 1);
});

test('fewer photos cut the video one second after the last photo leaves', () => {
  const ends = [5.7, 10.23, 14.27, 20.1, 25.43, 32.73];
  assert.equal(trimmedDuration(ends, 3, 32.733), 15.27);
  assert.equal(trimmedDuration(ends, 6, 32.733), 32.733);
  assert.equal(trimmedDuration(ends, 8, 32.733), 32.733);
});

test('extra slots reuse the photos in order', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => photoForSlot(i, 3)), [0, 1, 2, 0, 1]);
});

test('the admin editor and the server agree on the limits', () => {
  const file = path.resolve(__dirname, '../../../client/src/utils/collageVideo.ts');
  assert.ok(fs.existsSync(file), `client collage editor logic not found at ${file} - has it moved?`);
  const source = fs.readFileSync(file, 'utf8');
  const limits = { CUSTOM_VIDEO_MAX_SECONDS, CUSTOM_VIDEO_MAX_SLOTS, SLOT_MIN_SECONDS, SLOT_MIN_SIZE, TRIMMED_TAIL_SECONDS };
  for (const [name, value] of Object.entries(limits)) {
    assert.match(source, new RegExp(`export const ${name} = ${String(value).replace('.', '\\.')};`), `${name} differs between client and server`);
  }
});

test('pixel sizes stay even for the encoder and the output is sized by orientation', () => {
  assert.equal(evenPixels(0.5, 1081), 540);
  assert.equal(evenPixels(0.001, 1080), 2);
  assert.equal(outputWidth(1080, 1920), 540);
  assert.equal(outputWidth(1920, 1080), 960);
});
