import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { runScheduledReports } from '../services/scheduledReports';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Runs one scheduled-reports sweep on demand — the exact same runScheduledReports()
 * the hourly cron calls, with its own DB connection. Does not touch the running
 * server or its 5-min timer; safe to run anytime (the sweep's own idempotency
 * guard skips anything already sent within the current Israel hour).
 *
 * Usage: npx tsx server/src/scripts/check-scheduled-reports.ts
 */
async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('[check] connected — running one scheduled-reports sweep (verbose)');
  const sent = await runScheduledReports({ verbose: true });
  console.log(`[check] sweep finished — sent ${sent} report(s)`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
