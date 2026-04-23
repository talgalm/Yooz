/**
 * Scan Firestore for every station using componentId MQjFnoMsSMMJZ9YFlTzD
 * (the "קופסאות" / boxes escape challenge), and make sure the library has a
 * corresponding entry of type='riddle' with the correct settings.
 *
 * If a library item with the same (customer, name, kind='station') already
 * exists, its type/settings are UPDATED to riddle. Otherwise, a new library
 * item is created.
 *
 * Usage:
 *   npx tsx src/scripts/fix-riddle-stations.ts            # dry-run
 *   npx tsx src/scripts/fix-riddle-stations.ts --apply    # write changes
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import admin from 'firebase-admin';
import { MONGODB_URI } from '../config';
import { LibraryItem } from '../models/LibraryItem';

const APPLY = process.argv.includes('--apply');
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../../firestore-service-account.json');
const RIDDLE_COMPONENT_ID = 'MQjFnoMsSMMJZ9YFlTzD';

const CANDIDATE_KEYS = ['text', 'value', 'answer', 'content', 'name', 'label', 'title'];

function extractStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    for (const k of CANDIDATE_KEYS) {
      const val = obj[k];
      if (typeof val === 'string' && val.trim()) return val.trim();
    }
  }
  return '';
}

interface RiddleSettings {
  clue: string;
  answer: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  maxScore?: number;
}

function buildRiddleSettings(cfg: Record<string, unknown>): RiddleSettings {
  const photo = extractStr(cfg.codeFramesMultPhoto);
  const video = extractStr(cfg.codeFramesMultVideo);
  const settings: RiddleSettings = {
    clue: extractStr(cfg.description) || extractStr(cfg.header),
    answer: extractStr(cfg.codeFramesMultAns) || extractStr(cfg.codeFramesMultAnsChk),
    maxScore: 100,
  };
  if (photo) { settings.mediaUrl = photo; settings.mediaType = 'image'; }
  else if (video) { settings.mediaUrl = video; settings.mediaType = 'video'; }
  return settings;
}

async function main() {
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount as admin.ServiceAccount) });
  const db = admin.firestore();
  await mongoose.connect(MONGODB_URI);

  console.log(`Mode: ${APPLY ? '🔧 APPLY' : '🔍 DRY-RUN'}\n`);

  let found = 0;
  let created = 0;
  let updated = 0;
  let skippedNoAnswer = 0;
  let skippedNoName = 0;

  const customers = await db.collection('customers').get();
  console.log(`Scanning ${customers.size} customers for componentId=${RIDDLE_COMPONENT_ID}...\n`);

  for (const cust of customers.docs) {
    const customerName = ((cust.data().name as string) || '').trim();
    const lang = (cust.data().language as string) || 'he';
    if (!customerName) continue;

    const matches = await cust.ref
      .collection('componentsConfigurationSets')
      .where('componentId', '==', RIDDLE_COMPONENT_ID)
      .get();

    for (const s of matches.docs) {
      const data = s.data();
      const rawName = (data.name as string) || '';
      const name = rawName.trim();
      if (!name) { skippedNoName++; continue; }

      const cfg = (data.configurations as Record<string, unknown>) || {};
      const newSettings = buildRiddleSettings(cfg);
      if (!newSettings.answer) {
        console.log(`SKIP  (no answer)  "${name}" [${customerName}] firestoreId=${s.id}`);
        skippedNoAnswer++;
        continue;
      }
      found++;

      // Find an existing library item — prefer exact, fall back to normalized name
      const existing = await LibraryItem.findOne({
        kind: 'station',
        customer: customerName,
        name: name,
      }).lean();

      if (existing) {
        const tags = Array.from(new Set([...(existing.tags || []), 'riddle']));
        console.log(
          `UPDATE [${existing._id}] "${name}" [${customerName}]  (prev type=${existing.type}) → riddle  answer="${newSettings.answer}"`,
        );
        if (APPLY) {
          await LibraryItem.updateOne(
            { _id: existing._id },
            { $set: { type: 'riddle', settings: newSettings, tags } },
          );
        }
        updated++;
      } else {
        console.log(`CREATE "${name}" [${customerName}] → riddle  answer="${newSettings.answer}"`);
        if (APPLY) {
          await LibraryItem.create({
            kind: 'station',
            type: 'riddle',
            name,
            description: `Imported from customer "${customerName}" (riddle)`,
            customer: customerName,
            lang,
            tags: ['imported', customerName, lang, 'riddle'],
            settings: newSettings as unknown as Record<string, unknown>,
          });
        }
        created++;
      }
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(APPLY ? '✅ APPLY COMPLETE' : '🔍 DRY-RUN COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`Firestore riddles found : ${found + skippedNoAnswer + skippedNoName}`);
  console.log(`Updated existing items  : ${updated}`);
  console.log(`Created new items       : ${created}`);
  console.log(`Skipped (no answer)     : ${skippedNoAnswer}`);
  console.log(`Skipped (no name)       : ${skippedNoName}`);
  if (!APPLY) console.log('\n(re-run with --apply to write changes)');

  await mongoose.disconnect();
  await admin.app().delete();
}

main().catch((e) => { console.error(e); process.exit(1); });
