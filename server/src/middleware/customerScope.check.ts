/**
 * Standalone self-check for customerMongoFilter (customer role → activity scope).
 * No test framework — run it directly:  npx tsx server/src/middleware/customerScope.check.ts
 *
 * Guards the case-insensitive managerEmail match: managerEmail is stored as typed,
 * so an exact-match filter silently hid managed activities (and their stats).
 */
import assert from 'assert';
import { Request } from 'express';
import { customerMongoFilter } from './customerScope';

const req = (role: string, email: string) => ({ admin: { role, email } }) as unknown as Request;

const anyFilter = customerMongoFilter(req('super_admin', 'boss@yooz.co.il'));
assert.deepStrictEqual(anyFilter, {}, 'non-customer roles are not scoped');

const filter = customerMongoFilter(req('customer', 'Tal.Galmor+x@Foo.com')) as {
  $or: [{ createdByEmail: string }, { managerEmail: RegExp }];
};
assert.strictEqual(filter.$or[0].createdByEmail, 'tal.galmor+x@foo.com', 'createdByEmail lowercased');

const managerEmail = filter.$or[1].managerEmail;
assert.ok(managerEmail.test('Tal.Galmor+X@Foo.com'), 'matches the email as typed');
assert.ok(managerEmail.test('tal.galmor+x@foo.com'), 'matches the lowercased email');
assert.ok(!managerEmail.test('talxgalmor+x@foo.com'), 'the dot is escaped, not a wildcard');
assert.ok(!managerEmail.test('other-tal.galmor+x@foo.com.evil'), 'anchored at both ends');

console.log('customerScope self-check passed');
