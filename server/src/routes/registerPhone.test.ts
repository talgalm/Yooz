import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { Activity, PhoneRegistration } from '../models';
import { israelDayString } from '../utils/israelTime';
import activityGroupsRouter from './activityGroups';

// The route only ever asks Mongo two things — "is there such a user-control
// activity" and "upsert this registration" — so stubbing both keeps the test
// on the param handling and off a database.
let upserted: Record<string, unknown> | null;
const knownCode = 'ABC123';

(Activity as unknown as { findOne: unknown }).findOne = async (filter: { code?: string }) =>
  (filter.code && filter.code === knownCode ? { _id: 'x', code: filter.code } : null);
(PhoneRegistration as unknown as { updateOne: unknown }).updateOne = async (filter: Record<string, unknown>) => {
  upserted = filter;
  return { acknowledged: true };
};

const app = express().use('/api/activities', activityGroupsRouter);
const server = app.listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/activities/register-phone`;
test.after(() => server.close());

async function call(query: string) {
  upserted = null;
  const res = await fetch(`${base}${query}`);
  return { status: res.status, body: await res.json() as Record<string, unknown> };
}

test('code omitted registers for every user-control activity', async () => {
  const { status, body } = await call('?phone=%2B972-50-123-4567&date=08-09-2026');
  assert.equal(status, 200);
  assert.deepEqual(body, { ok: true, phone: '0501234567', activityCode: null, date: '08-09-2026' });
  assert.deepEqual(upserted, { phone: '0501234567', activityCode: null, activityDay: '2026-09-08' });
});

test('an empty code param reads the same as omitting it', async () => {
  const { status, body } = await call('?phone=0501234567&code=&date=08-09-2026');
  assert.equal(status, 200);
  assert.equal(body.activityCode, null);
});

test('date omitted means today in Israel', async () => {
  const { status } = await call('?phone=0501234567');
  assert.equal(status, 200);
  assert.equal((upserted as { activityDay: string }).activityDay, israelDayString());
});

test('a code is honoured, and 404s when no such user-control activity', async () => {
  assert.equal((await call('?phone=0501234567&code=ABC123')).body.activityCode, 'ABC123');
  assert.equal((await call('?phone=0501234567&code=NOPE12')).status, 404);
});

test('junk phone and junk date are rejected before any write', async () => {
  assert.deepEqual(await call('?phone=123'), { status: 400, body: { error: 'invalid_phone' } });
  assert.equal(upserted, null);
  assert.deepEqual(await call('?phone=0501234567&date=31-02-2026'), { status: 400, body: { error: 'invalid_date' } });
  assert.deepEqual(await call('?phone=0501234567&date=2026-09-08'), { status: 400, body: { error: 'invalid_date' } });
  assert.equal(upserted, null);
});
