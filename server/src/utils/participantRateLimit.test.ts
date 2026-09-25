import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { createRateLimiter, participantFromRequest } from './participantRateLimit';

const LIMITS = { perParticipant: 3, perAnonymous: 2, perAddress: 10 };

/** A request from one device, optionally carrying a participant session. */
const req = (address: string, participant?: string) =>
  ({
    ip: address,
    socket: {},
    headers: participant ? { authorization: `Bearer ${participant}` } : {},
  }) as never;

/** The limiter under test, identifying participants by the raw header value. */
const limiter = () => createRateLimiter(LIMITS, (r) => {
  const header = (r.headers as Record<string, string>)['authorization'];
  return header ? header.replace('Bearer ', '') : null;
});

test('one participant is cut off at their own allowance', () => {
  const isLimited = limiter();
  const calls = [1, 2, 3, 4].map(() => isLimited(req('1.1.1.1', 'dana')));
  assert.deepEqual(calls, [false, false, false, true]);
});

test('a group behind one address does not share one allowance', () => {
  // The bug this exists to prevent: everyone plays from the venue's WiFi, so
  // every phone reaches the server from the same address.
  const isLimited = limiter();
  for (let i = 0; i < 3; i++) assert.equal(isLimited(req('1.1.1.1', 'dana')), false);
  assert.equal(isLimited(req('1.1.1.1', 'dana')), true, 'dana has spent her own allowance');
  assert.equal(isLimited(req('1.1.1.1', 'yossi')), false, 'yossi must not pay for dana');
  assert.equal(isLimited(req('1.1.1.1', 'noa')), false);
});

test('the address still holds a ceiling, so one venue cannot drain the provider', () => {
  const isLimited = createRateLimiter(
    { perParticipant: 100, perAnonymous: 2, perAddress: 4 },
    (r) => ((r.headers as Record<string, string>)['authorization'] || '').replace('Bearer ', '') || null
  );
  const seen = [1, 2, 3, 4, 5].map((n) => isLimited(req('1.1.1.1', `player-${n}`)));
  assert.deepEqual(seen, [false, false, false, false, true]);
});

test('a caller with no session keeps the strict per-address count', () => {
  const isLimited = limiter();
  assert.equal(isLimited(req('9.9.9.9')), false);
  assert.equal(isLimited(req('9.9.9.9')), false);
  assert.equal(isLimited(req('9.9.9.9')), true);
});

test('separate addresses are counted separately', () => {
  const isLimited = limiter();
  assert.equal(isLimited(req('1.1.1.1')), false);
  assert.equal(isLimited(req('1.1.1.1')), false);
  assert.equal(isLimited(req('1.1.1.1')), true);
  assert.equal(isLimited(req('2.2.2.2')), false);
});

test('a real token identifies the session that owns it', () => {
  const token = jwt.sign(
    { participantName: 'Dana', activityCode: 'ABC123', reportId: 'r-1', connectionType: 'single' },
    JWT_SECRET
  );
  assert.equal(participantFromRequest({ headers: { authorization: `Bearer ${token}` } }), 'r-1');
});

test('a token from before reportId existed still names its participant', () => {
  const token = jwt.sign(
    { participantName: 'Dana', activityCode: 'ABC123', connectionType: 'single' },
    JWT_SECRET
  );
  assert.equal(
    participantFromRequest({ headers: { authorization: `Bearer ${token}` } }),
    'ABC123:Dana'
  );
});

test('a forged or absent token is simply anonymous, it does not throw', () => {
  assert.equal(participantFromRequest({ headers: {} }), null);
  assert.equal(participantFromRequest({ headers: { authorization: 'Bearer nonsense' } }), null);
  assert.equal(participantFromRequest({ headers: { authorization: 'nonsense' } }), null);
});
