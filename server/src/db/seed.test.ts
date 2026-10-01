import { test } from 'node:test';
import assert from 'node:assert';
import { employeeLinkPlan } from './seed';

test('a Manage user with no admin account gets a new login', () => {
  assert.deepStrictEqual(employeeLinkPlan(undefined, true), { action: 'create' });
});

test('an existing super admin is linked without a role change', () => {
  assert.deepStrictEqual(employeeLinkPlan('super_admin', true), { action: 'link' });
});

test('any other existing role is linked and reported as elevated', () => {
  for (const role of ['viewer', 'customer', 'admin']) {
    assert.deepStrictEqual(employeeLinkPlan(role, true), { action: 'link', elevatedFrom: role });
  }
});

test('an inactive Manage user never gets admin access', () => {
  assert.deepStrictEqual(employeeLinkPlan(undefined, false), { action: 'skip' });
  assert.deepStrictEqual(employeeLinkPlan('customer', false), { action: 'skip' });
});
