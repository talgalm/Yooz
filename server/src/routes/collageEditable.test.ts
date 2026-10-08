import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, editableTemplateVideo, iconRecolorFilter } from './collage';

test('a built-in video opens in the editor as a custom video with its photos in the green windows', () => {
  const video = editableTemplateVideo(TEMPLATES['gan-yehoshua'], 'https://res.cloudinary.com/demo/video/upload/g.mp4', 2);
  assert.ok(video);
  assert.equal(video.trimEnd, 10.9);
  assert.equal(video.keyColor, '#4fde69');
  assert.equal(video.keySimilarity, 0.1);
  assert.deepEqual(video.slots.map((s) => [s.startSec, s.endSec, s.layer, s.track]), [[2.8, 5.8, 'green', 0], [7, 10.3, 'green', 0]]);
  assert.deepEqual([video.slots[0].x, video.slots[0].y, video.slots[0].w, video.slots[0].h], [0.124, 0.222, 0.752, 0.556]);
});

test('all six photos keep the whole built-in video', () => {
  const video = editableTemplateVideo(TEMPLATES.default, 'https://res.cloudinary.com/demo/video/upload/d.mp4', 6);
  assert.equal(video?.slots.length, 6);
  assert.equal(video?.trimEnd, undefined);
});

test('only a template with a recoloured icon is baked before editing', () => {
  assert.equal(iconRecolorFilter(TEMPLATES.default), null);
  assert.match(iconRecolorFilter(TEMPLATES['gan-yehoshua']) ?? '', /colorkey=color=0xFFE51F/);
});
