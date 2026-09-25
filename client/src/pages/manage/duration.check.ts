import assert from 'assert';
import { parseDuration, formatHours, formatClock } from './duration';

assert.strictEqual(parseDuration('1:30', 'hours'), 90);
assert.strictEqual(parseDuration('1:30', 'minutes'), 90);
assert.strictEqual(parseDuration('0:45'), 45);
assert.strictEqual(parseDuration('10:00'), 600);

assert.strictEqual(parseDuration('1.5', 'hours'), 90);
assert.strictEqual(parseDuration('90', 'minutes'), 90);
assert.strictEqual(parseDuration('90', 'hours'), 5400);
assert.strictEqual(parseDuration('2', 'hours'), 120);

assert.strictEqual(parseDuration('1,5', 'hours'), 90);

assert.strictEqual(parseDuration('90m', 'hours'), 90);
assert.strictEqual(parseDuration('2h', 'minutes'), 120);
assert.strictEqual(parseDuration('45 min', 'hours'), 45);
assert.strictEqual(parseDuration('1.5 שעות', 'minutes'), 90);
assert.strictEqual(parseDuration('30 דקות', 'hours'), 30);

for (const bad of ['', '   ', 'abc', '-1', '0', '1:75', '1:2:3', '..', '5x']) {
  assert.strictEqual(parseDuration(bad), null, `"${bad}" must not parse`);
}

assert.ok(Number.isInteger(parseDuration('1.33', 'hours')!), 'must round to whole minutes');
assert.strictEqual(parseDuration('1.33', 'hours'), 80);

assert.strictEqual(formatHours(90), '1.5');
assert.strictEqual(formatHours(0), '0');
assert.strictEqual(formatHours(100), '1.7');
assert.strictEqual(formatClock(90), '1:30');
assert.strictEqual(formatClock(605), '10:05');
assert.strictEqual(formatClock(0), '0:00');

console.log('✅ duration self-check passed');
