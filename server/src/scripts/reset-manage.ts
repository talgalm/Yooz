/**
 * Yooz-Manage hard reset: drops every mng_* collection, then re-seeds the two
 * real accounts. Destructive and deliberately manual — never wired into boot.
 *
 * Usage (from repo root):
 *   npx tsx server/src/scripts/reset-manage.ts --yes
 */

import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { seedManageUsers } from '../db/seed';

const COLLECTIONS = [
  'mng_users',
  'mng_clients',
  'mng_projects',
  'mng_tasks',
  'mng_time_entries',
  'mng_expenses',
  'mng_interactions',
  'mng_change_requests',
  'mng_settings',
];

async function main() {
  if (!process.argv.includes('--yes')) {
    console.error('Refusing to wipe without --yes');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  for (const name of COLLECTIONS) {
    const before = await db.collection(name).countDocuments().catch(() => 0);
    // drop, not deleteMany: also clears stale indexes from earlier schemas
    await db.collection(name).drop().catch(() => {});
    console.log(`🗑️  ${name}: dropped (${before} docs)`);
  }

  await seedManageUsers();
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
