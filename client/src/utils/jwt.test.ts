import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isStaleDailyResetToken } from './jwt';

/** Minimal unsigned JWT — only the payload is read. */
function tokenFor(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `header.${body}.sig`;
}

const nowSec = Math.floor(Date.now() / 1000);
const yesterday = nowSec - 24 * 3600;

test('keeps a dailyReset session issued today', () => {
  assert.equal(isStaleDailyResetToken(tokenFor({ dailyReset: true, iat: nowSec })), false);
});

test('drops a dailyReset session issued on an earlier Israel day', () => {
  assert.equal(isStaleDailyResetToken(tokenFor({ dailyReset: true, iat: yesterday })), true);
});

test('leaves a normal activity alone — multi-day resume is a feature there', () => {
  assert.equal(isStaleDailyResetToken(tokenFor({ iat: yesterday })), false);
});

test('never throws on a malformed token', () => {
  assert.equal(isStaleDailyResetToken('not-a-jwt'), false);
});
