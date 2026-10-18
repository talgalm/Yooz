import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CloudinaryAsset,
  cloudinaryDeliveryUrl,
  downsizeTransformFor,
  isExpiredCollageInput,
  posterKeyFor,
  s3KeyFor,
} from './cloudinaryToS3';

const asset = (over: Partial<CloudinaryAsset>): CloudinaryAsset => ({
  publicId: 'yooz/abc',
  resourceType: 'image',
  format: 'png',
  version: 123,
  bytes: 1000,
  createdAt: '2026-10-01T00:00:00Z',
  ...over,
});

test('s3 key keeps the Cloudinary public id and adds the format', () => {
  assert.equal(s3KeyFor(asset({})), 'yooz/abc.png');
  assert.equal(s3KeyFor(asset({ resourceType: 'raw', publicId: 'yooz/doc.pdf', format: undefined })), 'yooz/doc.pdf');
});

test('only videos get a poster key', () => {
  assert.equal(posterKeyFor(asset({ resourceType: 'video' })), 'yooz/abc.jpg');
  assert.equal(posterKeyFor(asset({})), null);
});

test('large images and uploaded videos are downsized, rendered collages are not', () => {
  assert.equal(downsizeTransformFor(asset({ bytes: 1_000 })), null);
  assert.ok(downsizeTransformFor(asset({ bytes: 5_000_000 })));
  assert.ok(downsizeTransformFor(asset({ resourceType: 'video', format: 'mp4', bytes: 50_000_000 })));
  assert.equal(downsizeTransformFor(asset({ resourceType: 'video', publicId: 'yooz/collages/x', bytes: 50_000_000 })), null);
});

test('collage inputs expire after two days, other folders never', () => {
  const now = Date.parse('2026-10-10T00:00:00Z');
  assert.equal(isExpiredCollageInput(asset({ publicId: 'yooz/collage-inputs/a/b' }), now), true);
  assert.equal(isExpiredCollageInput(asset({ publicId: 'yooz/collage-inputs/a/b', createdAt: '2026-10-09T12:00:00Z' }), now), false);
  assert.equal(isExpiredCollageInput(asset({}), now), false);
});

test('delivery url puts the transform before the version', () => {
  assert.equal(cloudinaryDeliveryUrl('cl', asset({}), null), 'https://res.cloudinary.com/cl/image/upload/v123/yooz/abc.png');
  assert.equal(
    cloudinaryDeliveryUrl('cl', asset({ resourceType: 'video', format: 'mp4' }), 'w_720', 'jpg'),
    'https://res.cloudinary.com/cl/video/upload/w_720/v123/yooz/abc.jpg',
  );
});
