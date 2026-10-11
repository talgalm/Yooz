import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeOrganizerContacts, organizerContactsOf, ORGANIZER_CONTACTS_MAX } from './organizerContacts';

test('contacts keep only rows with both a name and a phone, trimmed and capped', () => {
  assert.deepEqual(
    sanitizeOrganizerContacts([{ name: ' Dana ', phone: ' 050-1234567 ' }, { name: 'No phone', phone: '' }, null, { name: 'Yossi', phone: '052' }]),
    [{ name: 'Dana', phone: '050-1234567' }, { name: 'Yossi', phone: '052' }],
  );
  const many = Array.from({ length: 9 }, (_, i) => ({ name: `n${i}`, phone: `${i}` }));
  assert.equal(sanitizeOrganizerContacts(many).length, ORGANIZER_CONTACTS_MAX);
  assert.deepEqual(sanitizeOrganizerContacts('x'), []);
});

test('an activity saved with the single contact fields still reads as one contact', () => {
  assert.deepEqual(organizerContactsOf({ organizerContactName: 'Dana', organizerContactPhone: '050' }), [{ name: 'Dana', phone: '050' }]);
  assert.deepEqual(organizerContactsOf({ organizerContacts: [{ name: 'A', phone: '1' }], organizerContactName: 'Dana', organizerContactPhone: '050' }), [{ name: 'A', phone: '1' }]);
  assert.deepEqual(organizerContactsOf({ organizerContactName: 'Dana' }), []);
});
