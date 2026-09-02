/**
 * Standalone self-check for the duration parser.
 * No test framework — run it directly:
 *   npx tsx client/src/pages/manage/duration.check.ts
 *
 * This guards a money path: a misparsed duration writes a wrong cost snapshot
 * that nothing downstream can detect.
 */
import assert from 'assert';
import { parseDuration, formatHours, formatClock } from './duration';

// h:mm is unambiguous and ignores the unit selector.
assert.strictEqual(parseDuration('1:30', 'hours'), 90);
assert.strictEqual(parseDuration('1:30', 'minutes'), 90);
assert.strictEqual(parseDuration('0:45'), 45);
assert.strictEqual(parseDuration('10:00'), 600);

// A bare number follows the selector — no guessing.
assert.strictEqual(parseDuration('1.5', 'hours'), 90);
assert.strictEqual(parseDuration('90', 'minutes'), 90);
assert.strictEqual(parseDuration('90', 'hours'), 5400);
assert.strictEqual(parseDuration('2', 'hours'), 120);

// A comma decimal is what a Hebrew keyboard produces.
assert.strictEqual(parseDuration('1,5', 'hours'), 90);

// An explicit suffix overrides the selector, in both languages.
assert.strictEqual(parseDuration('90m', 'hours'), 90);
assert.strictEqual(parseDuration('2h', 'minutes'), 120);
assert.strictEqual(parseDuration('45 min', 'hours'), 45);
assert.strictEqual(parseDuration('1.5 שעות', 'minutes'), 90);
assert.strictEqual(parseDuration('30 דקות', 'hours'), 30);

// Rejected rather than silently coerced.
for (const bad of ['', '   ', 'abc', '-1', '0', '1:75', '1:2:3', '..', '5x']) {
  assert.strictEqual(parseDuration(bad), null, `"${bad}" must not parse`);
}

// Whole minutes only — the model stores integers.
assert.ok(Number.isInteger(parseDuration('1.33', 'hours')!), 'must round to whole minutes');
assert.strictEqual(parseDuration('1.33', 'hours'), 80);

// Display
assert.strictEqual(formatHours(90), '1.5');
assert.strictEqual(formatHours(0), '0');
assert.strictEqual(formatHours(100), '1.7');
assert.strictEqual(formatClock(90), '1:30');
assert.strictEqual(formatClock(605), '10:05');
assert.strictEqual(formatClock(0), '0:00');

console.log('✅ duration self-check passed');
