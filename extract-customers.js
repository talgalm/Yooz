#!/usr/bin/env node
/**
 * Firestore Customers Extractor
 * Fetches the entire `customers` collection with ALL subcollections and nested data.
 *
 * Setup:
 *   node extract-customers.js
 *
 * Output: firestore-export/customers.json
 */

const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccount.json');
const OUTPUT_FILE = path.join(__dirname, 'firestore-export', 'customers-full.json');

async function fetchAll(docRef, depth = 0) {
  const subColls = await docRef.listCollections();
  const result = {};

  for (const subRef of subColls) {
    const indent = '  '.repeat(depth + 1);
    process.stdout.write(`\n${indent}↳ [${subRef.id}]`);

    const snapshot = await subRef.get();
    result[subRef.id] = [];

    for (const doc of snapshot.docs) {
      const entry = { _id: doc.id, ...doc.data() };
      // Recurse into nested subcollections
      const nested = await fetchAll(doc.ref, depth + 1);
      if (Object.keys(nested).length > 0) {
        entry._subcollections = nested;
      }
      result[subRef.id].push(entry);
    }

    process.stdout.write(` (${snapshot.docs.length} docs)`);
  }

  return result;
}

async function main() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('ERROR: serviceAccount.json not found.');
    process.exit(1);
  }

  let admin;
  try {
    admin = require('firebase-admin');
  } catch (e) {
    console.error('ERROR: firebase-admin not installed. Run: npm install firebase-admin');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'yooz-production',
  });
  const db = admin.firestore();

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log('Connected to Firestore: yooz-production');
  console.log('Fetching: customers ...\n');

  const snapshot = await db.collection('customers').get();
  const total = snapshot.docs.length;
  console.log(`Found ${total} customer documents\n`);

  const customers = [];

  for (let i = 0; i < snapshot.docs.length; i++) {
    const doc = snapshot.docs[i];
    process.stdout.write(`[${i + 1}/${total}] Customer: ${doc.id}`);

    const entry = { _id: doc.id, ...doc.data() };

    // Fetch ALL subcollections recursively
    const subcollections = await fetchAll(doc.ref, 0);
    if (Object.keys(subcollections).length > 0) {
      entry._subcollections = subcollections;
    }

    customers.push(entry);
    process.stdout.write('\n');
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(customers, null, 2));

  console.log('\n✅ Export complete!');
  console.log(`   ${total} customers saved`);
  console.log(`   File: ${OUTPUT_FILE}`);
  console.log(`   Size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
