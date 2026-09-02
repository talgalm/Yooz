import test from 'node:test';
import assert from 'node:assert/strict';
import { taskVisibility } from './taskVisibility';

const userId = '507f1f77bcf86cd799439011';

test('owner and pm see every task', () => {
  assert.deepEqual(taskVisibility({ role: 'owner', userId }), {});
  assert.deepEqual(taskVisibility({ role: 'pm', userId }), {});
});

test('a member sees own, watched and published tasks — and nothing else', () => {
  const f = taskVisibility({ role: 'member', userId }) as { $or: Record<string, unknown>[] };
  const keys = f.$or.map((c) => Object.keys(c)[0]);
  assert.deepEqual(keys, ['assigneeUserId', 'createdBy', 'watcherUserIds', 'visibleToAll']);
  assert.equal(String(f.$or[0].assigneeUserId), userId);
  assert.equal(f.$or[3].visibleToAll, true);
});
