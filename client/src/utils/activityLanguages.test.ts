import test from 'node:test';
import assert from 'node:assert/strict';
import { nextStartLanguage } from './activityLanguages';

test('an activity opens in its starting language the first time only', () => {
  const first = nextStartLanguage([], 'abc123', 'en');
  assert.equal(first.lang, 'en');
  assert.deepEqual(first.started, ['abc123']);
  assert.equal(nextStartLanguage(first.started, 'abc123', 'en').lang, null);
  assert.equal(nextStartLanguage(first.started, 'zzz999', 'en').lang, 'en');
});

test('no starting language, or one the app does not know, leaves the language alone', () => {
  assert.equal(nextStartLanguage([], 'abc123', undefined).lang, null);
  assert.equal(nextStartLanguage([], 'abc123', 'xx').lang, null);
  assert.equal(nextStartLanguage([], undefined, 'en').lang, null);
});

test('only the most recent activities are remembered', () => {
  const many = Array.from({ length: 100 }, (_, i) => `c${i}`);
  const next = nextStartLanguage(many, 'new', 'en');
  assert.equal(next.started.length, 100);
  assert.equal(next.started[0], 'c1');
  assert.equal(next.started[99], 'new');
});
