import fs from 'fs';
import os from 'os';
import path from 'path';
import mongoose from 'mongoose';
import { CLOUDINARY_CLOUD_NAME, MEDIA_BUCKET, MEDIA_CDN_URL, MONGODB_URI } from '../config';
import { listObjects, mediaUrl } from '../services/mediaStore';
import { s3KeyFromCloudinaryUrl } from '../utils/cloudinaryToS3';
import { rewriteUrlsDeep, UrlMapper } from '../utils/rewriteCloudinaryUrls';

const APPLY = process.argv.includes('--apply');

interface CollectionReport {
  docs: number;
  changedDocs: number;
  replaced: number;
  unmapped: string[];
  residualDocs: number;
}

type Doc = Record<string, unknown> & { _id: unknown };

function changedFields(before: Doc, after: Doc): Record<string, unknown> {
  const set: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(after)) {
    if (field !== '_id' && value !== before[field]) set[field] = value;
  }
  return set;
}

function folderOf(url: string): string {
  const key = s3KeyFromCloudinaryUrl(url) ?? url;
  return key.split('/').slice(0, 2).join('/');
}

async function main() {
  if (!MONGODB_URI || !MEDIA_BUCKET || !MEDIA_CDN_URL || !CLOUDINARY_CLOUD_NAME) {
    throw new Error('MONGODB_URI, MEDIA_BUCKET, MEDIA_CDN_URL and CLOUDINARY_CLOUD_NAME are required');
  }
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'}: Cloudinary ${CLOUDINARY_CLOUD_NAME} URLs → ${MEDIA_CDN_URL}`);

  const stored = new Set((await listObjects('')).objects.map((o) => o.key));
  console.log(`S3 objects: ${stored.size}`);
  const ownPrefix = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/`;
  const mapUrl: UrlMapper = (url) => {
    if (!url.replace(/^http:/, 'https:').startsWith(ownPrefix)) return null;
    const key = s3KeyFromCloudinaryUrl(url);
    return key && stored.has(key) ? mediaUrl(key) : null;
  };

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const stamp = Date.now();
  const backupPath = path.join(os.tmpdir(), `cloudinary-url-backup-${stamp}.json`);
  const backup = APPLY ? fs.createWriteStream(backupPath) : null;
  backup?.write('[\n');
  let firstBackup = true;

  const reports: Record<string, CollectionReport> = {};
  for (const { name } of await db.listCollections().toArray()) {
    if (name.startsWith('system.')) continue;
    const report: CollectionReport = { docs: 0, changedDocs: 0, replaced: 0, unmapped: [], residualDocs: 0 };
    for await (const doc of db.collection<Doc>(name).find({})) {
      report.docs++;
      const { value, replaced, unmapped } = rewriteUrlsDeep(doc as Doc, mapUrl);
      report.unmapped.push(...unmapped);
      if (JSON.stringify(value).includes(`/${CLOUDINARY_CLOUD_NAME}/`) && !unmapped.length) report.residualDocs++;
      if (!replaced) continue;
      report.changedDocs++;
      report.replaced += replaced;
      if (APPLY) {
        backup!.write(`${firstBackup ? '' : ',\n'}${JSON.stringify({ collection: name, doc: mongoose.mongo.BSON.EJSON.serialize(doc) })}`);
        firstBackup = false;
        await db.collection(name).updateOne({ _id: doc._id }, { $set: changedFields(doc as Doc, value) });
      }
    }
    if (report.changedDocs || report.unmapped.length || report.residualDocs) reports[name] = report;
  }
  if (backup) {
    backup.write('\n]\n');
    await new Promise((resolve) => backup.end(resolve));
  }
  await mongoose.disconnect();

  console.log('\ncollection: docs changed / URLs rewritten / URLs left (no S3 file or other account) / docs with escaped leftovers');
  let totalDocs = 0;
  let totalUrls = 0;
  const allUnmapped: string[] = [];
  for (const [name, r] of Object.entries(reports)) {
    console.log(`  ${name}: ${r.changedDocs} / ${r.replaced} / ${r.unmapped.length} / ${r.residualDocs}  (of ${r.docs} docs)`);
    totalDocs += r.changedDocs;
    totalUrls += r.replaced;
    allUnmapped.push(...r.unmapped);
  }
  console.log(`\n${APPLY ? 'Rewrote' : 'Would rewrite'} ${totalUrls} URLs in ${totalDocs} documents.`);

  const unmappedByFolder = new Map<string, number>();
  for (const url of allUnmapped) unmappedByFolder.set(folderOf(url), (unmappedByFolder.get(folderOf(url)) ?? 0) + 1);
  console.log(`Left as Cloudinary: ${allUnmapped.length} URLs`);
  for (const [folder, count] of [...unmappedByFolder].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${folder}: ${count}`);

  const reportPath = path.join(os.tmpdir(), `cloudinary-url-report-${APPLY ? 'apply' : 'dry'}-${stamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(reports, null, 1));
  console.log(`\nReport: ${reportPath}`);
  if (APPLY) console.log(`Backup of every changed document: ${backupPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
