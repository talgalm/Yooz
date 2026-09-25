import { test } from 'node:test';
import assert from 'node:assert/strict';
import { israelDayRange, israelDayString, isIsraelDayString, israelDayFromDdMmYyyy, israelHour, israelDayOfWeek } from './israelTime';

test('covers exactly one Israel calendar day', () => {
  const { start, end } = israelDayRange('2026-09-07');
  assert.equal(israelDayString(start), '2026-09-07');
  assert.equal(israelDayString(new Date(end.getTime() - 1)), '2026-09-07');
  assert.equal(israelDayString(end), '2026-09-08');
});

test('holds across the DST boundary', () => {
  for (const day of ['2026-01-15', '2026-07-15', '2026-03-27', '2026-10-25']) {
    const { start, end } = israelDayRange(day);
    assert.equal(israelDayString(start), day, `start of ${day}`);
    assert.equal(israelDayString(new Date(end.getTime() - 1)), day, `end of ${day}`);
    const hours = (end.getTime() - start.getTime()) / 3_600_000;
    assert.ok(hours >= 23 && hours <= 25, `${day} spans ${hours}h`);
  }
});

test('isIsraelDayString accepts real days and rejects the rest', () => {
  assert.equal(isIsraelDayString('2026-09-07'), true);
  assert.equal(isIsraelDayString('2026-02-30'), false);
  assert.equal(isIsraelDayString('2026-9-7'), false);
  assert.equal(isIsraelDayString('07/09/2026'), false);
  assert.equal(isIsraelDayString(''), false);
});

test('israelDayFromDdMmYyyy converts and rejects junk', () => {
  assert.equal(israelDayFromDdMmYyyy('08-09-2026'), '2026-09-08');
  assert.equal(israelDayFromDdMmYyyy(' 31-12-2026 '), '2026-12-31');
  assert.equal(israelDayFromDdMmYyyy('31-02-2026'), null);
  assert.equal(israelDayFromDdMmYyyy('2026-09-08'), null);
  assert.equal(israelDayFromDdMmYyyy('8-9-2026'), null);
  assert.equal(israelDayFromDdMmYyyy(''), null);
});

test('israelHour reads the Israel wall-clock hour, including the midnight quirk', () => {
  assert.equal(israelHour(new Date('2026-01-15T10:00:00Z')), 12);
  assert.equal(israelHour(new Date('2026-07-15T10:00:00Z')), 13);
  assert.equal(israelHour(new Date('2026-01-14T22:00:00Z')), 0);
});

test('israelDayOfWeek matches the Israel calendar day, 0 = Sunday', () => {
  assert.equal(israelDayOfWeek(new Date('2026-01-15T10:00:00Z')), 4);
  assert.equal(israelDayOfWeek(new Date('2026-09-07T10:00:00Z')), 1);
});
