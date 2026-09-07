import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDailyResetDue } from './activityReset';

test('never wipes an activity that was only just armed', () => {
  assert.equal(isDailyResetDue(undefined, '2026-09-07'), false);
});

test('does not wipe twice on the same Israel day', () => {
  assert.equal(isDailyResetDue('2026-09-07', '2026-09-07'), false);
});

test('wipes once the Israel day has rolled over', () => {
  assert.equal(isDailyResetDue('2026-09-06', '2026-09-07'), true);
});
