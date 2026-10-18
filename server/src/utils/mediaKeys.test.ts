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
import { s3KeyFromCloudinaryUrl } from './cloudinaryToS3';

const CDN = 'https://d2gtmltd2d5ols.cloudfront.net';

test('cloudinary urls map to the key the copy script wrote', () => {
  assert.equal(s3KeyFromCloudinaryUrl('https://res.cloudinary.com/x/image/upload/v1712/yooz/file_ab.png'), 'yooz/file_ab.png');
  assert.equal(
    s3KeyFromCloudinaryUrl('https://res.cloudinary.com/x/image/upload/f_auto,q_auto,w_1200/v1712/yooz/a/b.jpg'),
    'yooz/a/b.jpg',
  );
  assert.equal(s3KeyFromCloudinaryUrl('https://res.cloudinary.com/x/video/upload/q_auto,w_720/yooz/clip.mp4'), 'yooz/clip.mp4');
  assert.equal(s3KeyFromCloudinaryUrl('https://res.cloudinary.com/x/video/upload/v1/yooz/clip.jpg?x=1'), 'yooz/clip.jpg');
  assert.equal(s3KeyFromCloudinaryUrl('https://res.cloudinary.com/x/image/upload/fl_attachment/yooz/r.png'), 'yooz/r.png');
  assert.equal(s3KeyFromCloudinaryUrl('https://res.cloudinary.com/x/raw/upload/v9/yooz/doc_x.pdf'), 'yooz/doc_x.pdf');
  assert.equal(s3KeyFromCloudinaryUrl('https://res.cloudinary.com/x/image/upload/v9/yooz/%D7%90.png'), 'yooz/א.png');
  assert.equal(s3KeyFromCloudinaryUrl('https://example.com/a.png'), null);
});

test('cdn urls round-trip through their key, Hebrew included', () => {
  const key = 'yooz/תיקייה/a b.png';
  assert.equal(mediaKeyFromUrl(`${CDN}/${encodeKeyForUrl(key)}`, CDN), key);
  assert.equal(mediaKeyFromUrl('https://res.cloudinary.com/x/image/upload/v1/yooz/a.png', CDN), 'yooz/a.png');
  assert.equal(mediaKeyFromUrl('https://other.com/a.png', CDN), null);
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
