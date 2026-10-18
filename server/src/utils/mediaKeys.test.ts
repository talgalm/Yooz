import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeKeyForUrl,
  extensionForUpload,
  mediaKeyFromUrl,
  newMediaKey,
  posterKeyOf,
  publicIdOf,
  resourceTypeOf,
  slugForFileName,
} from './mediaKeys';

const CDN = 'https://d2gtmltd2d5ols.cloudfront.net';

test('cdn urls round-trip through their key, Hebrew included', () => {
  const key = 'yooz/תיקייה/a b.png';
  assert.equal(mediaKeyFromUrl(`${CDN}/${encodeKeyForUrl(key)}?v=1`, CDN), key);
  assert.equal(mediaKeyFromUrl('https://other.com/a.png', CDN), null);
  assert.equal(mediaKeyFromUrl(`${CDN}/a.png`, ''), null);
});

test('resource type, public id and poster follow the extension', () => {
  assert.equal(resourceTypeOf('yooz/a.JPG'), 'image');
  assert.equal(resourceTypeOf('yooz/a.mp3'), 'video');
  assert.equal(resourceTypeOf('yooz/a.pdf'), 'raw');
  assert.equal(publicIdOf('yooz/a.mp4'), 'yooz/a');
  assert.equal(publicIdOf('yooz/a.pdf'), 'yooz/a.pdf');
  assert.equal(posterKeyOf('yooz/collages/x.mp4'), 'yooz/collages/x.jpg');
});

test('new keys keep a readable slug and stay unique', () => {
  assert.equal(slugForFileName('My Photo (1).PNG'), 'my-photo-1');
  assert.equal(slugForFileName('תמונה.png'), 'file');
  const a = newMediaKey('yooz', 'x.png', 'png');
  assert.match(a, /^yooz\/x_[0-9a-f]{8}\.png$/);
  assert.notEqual(a, newMediaKey('yooz', 'x.png', 'png'));
  assert.equal(extensionForUpload('video/quicktime', 'clip.MOV'), 'mov');
  assert.equal(extensionForUpload('application/x-unknown', 'a.KEY'), 'key');
});
