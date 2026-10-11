import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactClause, askClause } from './help.i18n';

const dana = { name: 'דנה', phone: '050-1111111' };
const yossi = { name: 'יוסי', phone: '052-2222222' };
const rina = { name: 'רינה', phone: '054-3333333' };

test('the help bot names every contact person, joined with "or"', () => {
  assert.equal(contactClause('he', [dana]), 'פנו לדנה בטלפון 050-1111111');
  assert.equal(contactClause('he', [dana, yossi]), 'פנו לדנה בטלפון 050-1111111 או ליוסי בטלפון 052-2222222');
  assert.equal(askClause('he', [dana, yossi, rina]), 'בקשו מדנה בטלפון 050-1111111, מיוסי בטלפון 052-2222222 או מרינה בטלפון 054-3333333');
  assert.equal(contactClause('en', [{ name: 'Dana', phone: '1' }, { name: 'Yossi', phone: '2' }]), 'contact Dana at 1 or Yossi at 2');
});

test('with no contact the help bot points to the organizer', () => {
  assert.equal(contactClause('he', []), 'פנו למארגן הפעילות');
  assert.equal(askClause('en'), 'ask your facilitator');
});
