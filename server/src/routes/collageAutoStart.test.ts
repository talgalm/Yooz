import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { CollageJob } from '../models';
import collageRouter, { hasAllPhotos } from './collage';

interface FakeJob {
  jobId: string;
  requiredImages: number;
  imageUrls: string[];
  phase: string;
  message: string;
  percent: number;
  autoStart?: boolean;
  save: () => Promise<void>;
}

let current: FakeJob;
let queued: Record<string, unknown>[];

(CollageJob as unknown as { findOne: unknown }).findOne = async () => current;
(CollageJob as unknown as { updateOne: unknown }).updateOne = async (filter: Record<string, unknown>) => {
  queued.push(filter);
  return { modifiedCount: 1 };
};

const app = express().use(express.json()).use('/api/collage', collageRouter);
const server = app.listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/collage`;
test.after(() => server.close());

function job(extra: Partial<FakeJob>): FakeJob {
  return { jobId: 'j1', requiredImages: 2, imageUrls: ['a.jpg'], phase: 'collecting', message: '', percent: 0, save: async () => undefined, ...extra };
}

async function upload(imageIndex: number) {
  queued = [];
  const res = await fetch(`${base}/photo-uploaded`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activityCode: 'abc123', jobId: 'j1', imageIndex, url: `p${imageIndex}.jpg` }),
  });
  return res.status;
}

test('with the setting on, the last photo starts the video once', async () => {
  current = job({ autoStart: true });
  assert.equal(await upload(1), 200);
  assert.deepEqual(queued, [{ jobId: 'j1', phase: { $in: ['collecting'] } }]);
});

test('a photo that still leaves one missing does not start it', async () => {
  current = job({ autoStart: true, requiredImages: 3 });
  assert.equal(await upload(1), 200);
  assert.deepEqual(queued, []);
});

test('without the setting the video waits for the participant, as before', async () => {
  current = job({});
  assert.equal(await upload(1), 200);
  assert.deepEqual(queued, []);
});

test('all photos means every required slot has one', () => {
  assert.equal(hasAllPhotos({ requiredImages: 2, imageUrls: ['a', 'b'] }), true);
  assert.equal(hasAllPhotos({ requiredImages: 2, imageUrls: ['a', ''] }), false);
  assert.equal(hasAllPhotos({ requiredImages: 3, imageUrls: ['a', 'b'] }), false);
});
