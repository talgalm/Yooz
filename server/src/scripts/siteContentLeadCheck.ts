import assert from 'node:assert';
import { validateLead } from '../routes/siteContent';

assert.equal(validateLead({ name: 'A', email: 'a@b.c', phone: '050' }), null);
assert.equal(validateLead({ email: 'a@b.c', phone: '050' }), 'Name is required');
assert.equal(validateLead({ name: 'A', phone: '050' }), 'Email is required');
assert.equal(validateLead({ name: '  ', email: 'a@b.c', phone: '050' }), 'Name is required');
assert.equal(validateLead({ name: 'A', email: 'a@b.c' }), 'Phone is required');

console.log('siteContent lead validation: OK');
