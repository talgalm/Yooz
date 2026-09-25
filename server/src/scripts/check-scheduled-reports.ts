import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { runScheduledReports } from '../services/scheduledReports';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

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
