import test from 'node:test';
import assert from 'node:assert/strict';
import { customFfmpegArgs } from './collage';
import type { CustomCollageVideo } from '../utils/collageSlots';

const video: CustomCollageVideo = {
  url: 'https://res.cloudinary.com/demo/video/upload/v.mp4',
  width: 720,
  height: 1280,
  duration: 20,
  slots: [
    { startSec: 1, endSec: 4, x: 0.25, y: 0.3, w: 0.5, h: 0.4 },
    { startSec: 6, endSec: 9, x: 0.25, y: 0.3, w: 0.5, h: 0.4, layer: 'behind', maskUrl: 'https://res.cloudinary.com/demo/image/upload/m.png' },
  ],
};

const optionsBefore = (args: string[], input: string) => args.slice(Math.max(0, args.indexOf(input) - 7), args.indexOf(input));

test('a mask goes in as one still image, so its frames cannot pile up ahead of the video', () => {
  const args = customFfmpegArgs(video, 'v.mp4', ['p0.jpg', 'p1.jpg'], { maskPaths: [undefined, 'mask.png'], hasAudio: false });
  assert.deepEqual(optionsBefore(args, 'mask.png').slice(-1), ['-i']);
  assert.ok(!optionsBefore(args, 'mask.png').includes('-loop'));
  assert.deepEqual(optionsBefore(args, 'p0.jpg'), ['-loop', '1', '-framerate', '20', '-t', '20', '-i']);
});

test('the mask is wired to the photo it belongs to', () => {
  const args = customFfmpegArgs(video, 'v.mp4', ['p0.jpg', 'p1.jpg'], { maskPaths: [undefined, 'mask.png'], hasAudio: false });
  const filter = args[args.indexOf('-filter_complex') + 1];
  assert.match(filter, /\[3:v\]scale=720:1280,format=gray\[mask1\]/);
});
