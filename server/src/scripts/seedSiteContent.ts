/**
 * Overwrite the singleton publicity-site content with DEFAULT_SITE_CONTENT
 * (the texts/examples from the deck). Run this once after editing the defaults.
 *
 * WARNING: replaces the existing doc — any edits made in the admin tab are lost.
 *
 * Usage: npx tsx src/scripts/seedSiteContent.ts
 */
import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { SiteContent, DEFAULT_SITE_CONTENT } from '../models';

async function main() {
  await mongoose.connect(MONGODB_URI);
  await SiteContent.deleteMany({});
  const doc = await SiteContent.create(DEFAULT_SITE_CONTENT);
  console.log('Seeded site content:', doc._id.toString());
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
