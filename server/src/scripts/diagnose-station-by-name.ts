import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import admin from 'firebase-admin';
import { MONGODB_URI } from '../config';
import { LibraryItem } from '../models/LibraryItem';

const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../../firestore-service-account.json');

const fragment = process.argv[2];
if (!fragment) {
  console.error('usage: diagnose-station-by-name.ts <fragment>');
  process.exit(1);
}

async function main() {
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount as admin.ServiceAccount) });
  const db = admin.firestore();
  await mongoose.connect(MONGODB_URI);

  const matches = await LibraryItem.find({
    kind: 'station',
    name: { $regex: fragment, $options: 'i' },
  }).lean();

  console.log(`── Mongo library items matching "${fragment}": ${matches.length} ──`);
  for (const m of matches.slice(0, 5)) {
    console.log(`  [${m._id}] type=${m.type}  customer="${m.customer}"  name="${m.name}"`);
  }
  if (matches.length === 0) { await finish(); return; }

  const pick = matches[0];
  console.log(`\n── Inspecting first match [${pick._id}] ──`);
  console.log(`Mongo settings keys: ${Object.keys(pick.settings || {}).join(', ') || '(none)'}\n`);

  if (!pick.customer) { console.log('no customer — cannot resolve Firestore source'); await finish(); return; }

  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const allCust = await db.collection('customers').get();
  const custDocs = allCust.docs.filter((d) => norm((d.data().name as string) || '') === norm(pick.customer!));
  console.log(`matched ${custDocs.length} customer doc(s) in Firestore`);

  for (const cust of custDocs) {
    const allStations = await cust.ref.collection('componentsConfigurationSets').get();
    const target = norm(pick.name);
    const stationMatches = allStations.docs.filter((d) => norm((d.data().name as string) || '') === target);
    console.log(`  customer ${cust.id}: ${stationMatches.length} station(s) with matching name`);

    for (const s of stationMatches) {
      const data = s.data();
      console.log(`\n  ── Firestore station doc ${s.id} ──`);
      console.log(`  name       : "${data.name}"`);
      console.log(`  componentId: ${data.componentId}`);
      console.log(`  configurations keys: ${Object.keys(data.configurations || {}).join(', ')}`);
      console.log(`\n  raw configurations:`);
      console.log(JSON.stringify(data.configurations, null, 2).split('\n').map((l) => '    ' + l).join('\n'));
    }
  }

  await finish();
}

async function finish() {
  await mongoose.disconnect();
  await admin.app().delete();
}

main().catch((e) => { console.error(e); process.exit(1); });
