import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { employeeLinkPlan } from '../db/seed';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const legacy = await db.collection('mng_users')
    .find({ passwordHash: { $exists: true } }, { projection: { email: 1, active: 1 } })
    .toArray();

  for (const m of legacy) {
    const existing = await db.collection('users').findOne({ email: m.email }, { projection: { role: 1 } });
    const plan = employeeLinkPlan(existing?.role, m.active !== false);
    const action = plan.action === 'skip' ? 'inactive, no login'
      : plan.action === 'create' ? 'new super_admin login'
        : plan.elevatedFrom ? `LINK + RAISE ${plan.elevatedFrom} → super_admin` : 'link to existing super_admin';
    console.log(`${m.email}: ${action}`);
  }
  console.log(`${legacy.length} Manage login(s) still to migrate`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
