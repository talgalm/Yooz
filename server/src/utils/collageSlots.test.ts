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
  SOURCE_VIDEO_MAX_SECONDS,
  MAX_FREEZES,
  FREEZE_MIN_SECONDS,
  FREEZE_MAX_SECONDS,
  DEFAULT_KEY_SIMILARITY,
  KEY_SIMILARITY_MIN,
  KEY_SIMILARITY_MAX,
  evenPixels,
  ffmpegColor,
  outputDuration,
  outputWidth,
  photoForSlot,
  sanitizeCustomCollageVideo,
  stackOrder,
  timelinePieces,
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

test('trimming and freezing build the final timeline piece by piece', () => {
  const pieces = timelinePieces({ duration: 30, trimStart: 2, trimEnd: 12, freezes: [{ atSec: 5, holdSec: 3 }, { atSec: 20, holdSec: 2 }] });
  assert.deepEqual(pieces, [
    { kind: 'play', srcStart: 2, srcEnd: 5, outStart: 0, outEnd: 3 },
    { kind: 'freeze', srcStart: 5, srcEnd: 5, outStart: 3, outEnd: 6 },
    { kind: 'play', srcStart: 5, srcEnd: 12, outStart: 6, outEnd: 13 },
  ]);
  assert.equal(outputDuration({ duration: 30, trimStart: 2, trimEnd: 12, freezes: [{ atSec: 5, holdSec: 3 }] }), 13);
  assert.equal(outputDuration({ duration: 8 }), 8);
});

test('a long source is fine as long as the final video stays under the cap', () => {
  const long = { ...video, duration: 200, trimStart: 100, trimEnd: 120 };
  assert.equal(sanitizeCustomCollageVideo(long)?.trimStart, 100);
  assert.equal(sanitizeCustomCollageVideo({ ...long, trimEnd: 200 }), undefined);
  assert.equal(sanitizeCustomCollageVideo({ ...video, duration: 400, trimEnd: 10 }), undefined);
});

test('slot times are clamped to the final timeline, freezes included', () => {
  const clean = sanitizeCustomCollageVideo({
    ...video,
    duration: 10,
    freezes: [{ atSec: 4, holdSec: 5 }],
    slots: [{ startSec: 13, endSec: 30, x: 0, y: 0, w: 0.5, h: 0.5 }],
  });
  assert.deepEqual(clean?.slots[0], { startSec: 13, endSec: 15, x: 0, y: 0, w: 0.5, h: 0.5 });
  assert.deepEqual(clean?.freezes, [{ atSec: 4, holdSec: 5 }]);
});

test('freezes outside the trimmed part are dropped and holds are capped', () => {
  const clean = sanitizeCustomCollageVideo({
    ...video,
    trimStart: 5,
    freezes: [{ atSec: 1, holdSec: 2 }, { atSec: 8, holdSec: 99 }],
  });
  assert.deepEqual(clean?.freezes, [{ atSec: 8, holdSec: 10 }]);
});

test('a slot keeps its layer, and only a slot behind a layer keeps a mask', () => {
  const clean = sanitizeCustomCollageVideo({
    ...video,
    keyColor: '#12AB34',
    keySimilarity: 5,
    slots: [
      { ...video.slots[0], layer: 'behind', maskUrl: 'https://res.cloudinary.com/demo/image/upload/mask.png' },
      { ...video.slots[0], layer: 'green', maskUrl: 'https://x/m.png' },
      { ...video.slots[0], layer: 'sideways' },
      { ...video.slots[0], layer: 'behind', maskUrl: 'javascript:1' },
    ],
  });
  assert.equal(clean?.slots[0].layer, 'behind');
  assert.equal(clean?.slots[0].maskUrl, 'https://res.cloudinary.com/demo/image/upload/mask.png');
  assert.equal(clean?.slots[1].layer, 'green');
  assert.equal(clean?.slots[1].maskUrl, undefined);
  assert.equal(clean?.slots[2].layer, undefined);
  assert.equal(clean?.slots[3].maskUrl, undefined);
  assert.equal(clean?.keyColor, '#12ab34');
  assert.equal(clean?.keySimilarity, 0.6);
  assert.equal(ffmpegColor('#12ab34'), '0x12AB34');
});

test('photos render back to front by timeline row, keeping a sane row number', () => {
  const clean = sanitizeCustomCollageVideo({
    ...video,
    slots: [
      { ...video.slots[0], track: 0 },
      { ...video.slots[0], track: 1 },
      { ...video.slots[0], track: 'x' },
      { ...video.slots[0], track: 99 },
    ],
  });
  assert.deepEqual(clean?.slots.map((s) => s.track), [0, 1, undefined, 11]);
  const at = (startSec: number, endSec: number, track?: number) => ({ ...video.slots[0], startSec, endSec, track });
  assert.deepEqual(stackOrder([at(0, 4, 0), at(2, 6, 1)]), [1, 0]);
  assert.deepEqual(stackOrder([at(0, 4), at(2, 6), at(5, 9)]), [1, 0, 2]);
});

test('the admin editor and the server agree on the limits', () => {
  const file = path.resolve(__dirname, '../../../client/src/utils/collageVideo.ts');
  assert.ok(fs.existsSync(file), `client collage editor logic not found at ${file} - has it moved?`);
  const source = fs.readFileSync(file, 'utf8');
  const limits = {
    CUSTOM_VIDEO_MAX_SECONDS,
    CUSTOM_VIDEO_MAX_SLOTS,
    SLOT_MIN_SECONDS,
    SLOT_MIN_SIZE,
    TRIMMED_TAIL_SECONDS,
    SOURCE_VIDEO_MAX_SECONDS,
    MAX_FREEZES,
    FREEZE_MIN_SECONDS,
    FREEZE_MAX_SECONDS,
    DEFAULT_KEY_SIMILARITY,
    KEY_SIMILARITY_MIN,
    KEY_SIMILARITY_MAX,
  };
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
