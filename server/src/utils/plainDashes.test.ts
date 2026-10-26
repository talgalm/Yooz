import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainDashes } from './plainDashes';

test('a dash between words becomes a spaced hyphen', () => {
  assert.equal(plainDashes('Not quite — try again'), 'Not quite - try again');
  assert.equal(plainDashes('the activity—limited to what it needs'), 'the activity - limited to what it needs');
  assert.equal(plainDashes('לא נכון – נסו שוב'), 'לא נכון - נסו שוב');
});

test('a number range keeps its numbers together', () => {
  assert.equal(plainDashes('2–50 characters'), '2-50 characters');
  assert.equal(plainDashes('1 — 2 sentences'), '1-2 sentences');
});

test('a dash opening a line becomes a list hyphen', () => {
  assert.equal(plainDashes('Steps:\n— open the station\n— scan the code'), 'Steps:\n- open the station\n- scan the code');
});

test('text without dashes is returned as it was', () => {
  assert.equal(plainDashes('Well done - 3 points'), 'Well done - 3 points');
});
