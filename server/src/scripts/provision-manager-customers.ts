
import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { Activity } from '../models';
import { provisionManagerCustomer } from '../utils/provisionManagerCustomer';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log(dryRun ? 'DRY RUN — no writes' : 'Provisioning manager customer accounts...');

  const activities = await Activity.find(
    { managerEmail: { $exists: true, $ne: '' } },
    { managerEmail: 1, name: 1, code: 1 },
  ).lean();

  let created = 0;
  let skipped = 0;
  let warnings = 0;

  const seen = new Set<string>();

  for (const activity of activities) {
    const email = activity.managerEmail?.toLowerCase().trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);

    if (dryRun) {
      console.log(`Would provision: ${email} (activity: ${activity.name} / ${activity.code})`);
      continue;
    }

    const result = await provisionManagerCustomer(email);
    if (result.ok) {
      created += 1;
      console.log(`OK: ${email}`);
    } else if (result.warning) {
      warnings += 1;
      console.warn(`WARN: ${email} — ${result.warning}`);
    } else {
      skipped += 1;
      console.log(`SKIP: ${email}`);
    }
  }

  console.log(`Done. provisioned=${created} warnings=${warnings} skipped=${skipped} uniqueEmails=${seen.size}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
