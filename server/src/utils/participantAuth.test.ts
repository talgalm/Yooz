import { test } from 'node:test';
import assert from 'node:assert';
import { Types } from 'mongoose';
import { ownReportFilter } from './participantAuth';

test('a pinned session addresses its own report by id, never by name', () => {
  const id = new Types.ObjectId().toString();
  const filter = ownReportFilter({ reportId: id, activityCode: 'dy1q6m', participantName: 'מור קפויה' });
  assert.deepStrictEqual(Object.keys(filter), ['_id']);
  assert.strictEqual(String(filter._id), id);
});

test('legacy tokens (no reportId) fall back to the name lookup', () => {
  assert.deepStrictEqual(
    ownReportFilter({ activityCode: 'dy1q6m', participantName: 'מור קפויה' }),
    { activityCode: 'dy1q6m', participantName: 'מור קפויה' },
  );
});

test('a junk reportId falls back instead of throwing on ObjectId cast', () => {
  assert.deepStrictEqual(
    ownReportFilter({ reportId: 'not-an-id', activityCode: 'dy1q6m', participantName: 'x' }),
    { activityCode: 'dy1q6m', participantName: 'x' },
  );
});
