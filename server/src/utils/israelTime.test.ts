import { test } from 'node:test';
import assert from 'node:assert/strict';
import { israelDayRange, israelDayString } from './israelTime';

/** A day window must start and end on that day's own Israel midnight. */
test('covers exactly one Israel calendar day', () => {
  const { start, end } = israelDayRange('2026-09-07');
  assert.equal(israelDayString(start), '2026-09-07');
  assert.equal(israelDayString(new Date(end.getTime() - 1)), '2026-09-07');
  // The exclusive bound already belongs to the next day.
  assert.equal(israelDayString(end), '2026-09-08');
});

/** Winter is UTC+2, summer UTC+3 — both must still land on midnight. */
test('holds across the DST boundary', () => {
  for (const day of ['2026-01-15', '2026-07-15', '2026-03-27', '2026-10-25']) {
    const { start, end } = israelDayRange(day);
    assert.equal(israelDayString(start), day, `start of ${day}`);
    assert.equal(israelDayString(new Date(end.getTime() - 1)), day, `end of ${day}`);
    const hours = (end.getTime() - start.getTime()) / 3_600_000;
    assert.ok(hours >= 23 && hours <= 25, `${day} spans ${hours}h`);
  }
});
