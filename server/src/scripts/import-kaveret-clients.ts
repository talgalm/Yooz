
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import { MONGODB_URI } from '../config';
import { Client, ClientStatus } from '../models/manage/Client';
import { ManageUser } from '../models/manage/ManageUser';

const EXPORT_YEAR = 2026;

const MERGE_BY_CARD: Record<string, string[]> = {
  'החוג לאחיות - אוניברסיטת תל אביב': ['112', '117', '118', '119', '120', '121', '122', '123'],
  'סיעוד - אוניברסיטת חיפה': ['114', '126', '127', '128', '129'],
  'סיעוד - הדסה / האוניברסיטה העברית': ['113', '124', '125'],
  'המכללה האקדמית תל אביב יפו': ['115', '169'],
  'מכללת אריאל': ['156', '161', '175'],
  'מכללת בראודה להנדסה': ['152', '153'],
  'מכללת עמק יזרעאל': ['154', '234'],
  'מכללת פרס': ['160', '217'],
  'מכללת רמת גן': ['185', '186'],
  'התאחדות משרדי הנסיעות - דמו לונדון': ['66', '74'],
  'פעילות עמק חפר בתל קקון': ['8', '97'],
  'רשות הטבע והגנים': ['7', '82', '111'],
  'שימור אתרים': ['73', '183'],
};

const CARD_TO_GROUP = new Map(
  Object.entries(MERGE_BY_CARD).flatMap(([name, nums]) => nums.map((n) => [n, name] as const)),
);

const STATUS_RANK: ClientStatus[] = ['active', 'prospect', 'paused', 'irrelevant', 'past'];

type Row = Record<string, string | number>;

const str = (v: string | number | undefined) => String(v ?? '').trim();

export function splitCard(raw: string): { name: string; number: string } {
  const m = raw.match(/^(.*?)\s*\/\/\/\s*(\d+)\s*$/);
  const name = (m ? m[1] : raw).replace(/^[\s,'"]+/, '').trim();
  return { name, number: m ? m[2] : '' };
}

export function parseDate(raw: string): Date | undefined {
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (!m) return undefined;
  return new Date(Date.UTC(Number(m[3] ?? EXPORT_YEAR), Number(m[2]) - 1, Number(m[1])));
}

export function mapStatus(isCustomer: string, kaveretStatus: string, active: string): ClientStatus {
  if (active === 'לא') return 'past';
  if (kaveretStatus === 'לא רלוונטי') return 'irrelevant';
  if (isCustomer === 'כן' || kaveretStatus === 'לקוח חדש') return 'active';
  return 'prospect';
}

export function groupKey(name: string, number: string): string {
  return CARD_TO_GROUP.get(number)
    ?? name.replace(/\.\.\.$/, '').replace(/["'״׳]/g, '').replace(/[-–,./\\|()]+/g, ' ')
      .replace(/\s+/g, ' ').trim().toLowerCase();
}

interface Card {
  number: string;
  name: string;
  status: ClientStatus;
  stage: string;
  owner: string;
  contact: { name: string; email?: string; phone?: string };
  lastContactDate?: Date;
  note: string;
  archived: boolean;
}

export function toCard(row: Row): Card {
  const { name, number } = splitCard(str(row['כרטיס // מספר']));
  const stage = str(row['סטטוס']);
  const email = str(row['מיילים']);
  const phone = str(row['טלפונים']);
  return {
    number,
    name,
    status: mapStatus(str(row['לקוח']), stage, str(row['פעיל'])),
    stage,
    owner: str(row['מנהל תיק']),
    contact: { name: str(row['איש קשר']), email: email || undefined, phone: phone || undefined },
    lastContactDate: parseDate(str(row['התקשרות אחרונה'])),
    note: [
      `כרטיס ${number}`,
      str(row['כתובת']) && `כתובת: ${str(row['כתובת'])}`,
      str(row['רמת דחיפות']) && `דחיפות: ${str(row['רמת דחיפות'])}`,
      str(row['פוטנציאל מכירה']) && `פוטנציאל: ${str(row['פוטנציאל מכירה'])}`,
    ].filter(Boolean).join(' · '),
    archived: str(row['פעיל']) === 'לא',
  };
}

function mode(values: string[]): string | undefined {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function mergeCards(key: string, cards: Card[]) {
  const identity = (c: Card) => c.contact.email ?? c.contact.phone ?? c.contact.name;
  const contacts = cards
    .filter((c) => identity(c))
    .filter((c, i, all) => all.findIndex((o) => identity(o) === identity(c)) === i)
    .map((c, i) => ({ ...c.contact, name: c.contact.name || 'איש קשר', isPrimary: i === 0 }));

  const dates = cards.map((c) => c.lastContactDate).filter((d): d is Date => !!d);

  return {
    name: MERGE_BY_CARD[key]
      ? key
      : cards.map((c) => c.name).sort((a, b) => Number(a.endsWith('...')) - Number(b.endsWith('...')))[0],
    cards: cards.map((c) => c.number),
    domain: 'other' as const,
    status: STATUS_RANK.find((s) => cards.some((c) => c.status === s))!,
    leadSource: 'existing' as const,
    contacts,
    owner: mode(cards.map((c) => c.owner)),
    lastContactDate: dates.length ? new Date(Math.max(...dates.map((d) => +d))) : undefined,
    tags: [...new Set(cards.map((c) => c.stage).filter(Boolean))],
    notes: ['יובא מכוורת', ...cards.map((c) => c.note)].join('\n'),
    archived: cards.every((c) => c.archived),
  };
}

export function buildClients(rows: Row[]) {
  const groups = new Map<string, Card[]>();
  for (const card of rows.map(toCard)) {
    const key = groupKey(card.name, card.number);
    groups.set(key, [...(groups.get(key) ?? []), card]);
  }
  const clients = [...groups].map(([key, cards]) => mergeCards(key, cards));

  const counts = new Map<string, number>();
  clients.forEach((c) => counts.set(c.name, (counts.get(c.name) ?? 0) + 1));
  clients.forEach((c) => { if (counts.get(c.name)! > 1) c.name = `${c.name} (${c.cards[0]})`; });
  return clients;
}

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith('--')) {
    console.error('Usage: npx tsx server/src/scripts/import-kaveret-clients.ts <file.xls> [--dry-run] [--replace]');
    process.exit(1);
  }
  const dryRun = process.argv.includes('--dry-run');

  const sheet = XLSX.readFile(file).Sheets['Sheet 1'];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: '' });
  const clients = buildClients(rows);

  await mongoose.connect(MONGODB_URI);

  const [owner, member] = await Promise.all([
    ManageUser.findOne({ role: 'owner' }),
    ManageUser.findOne({ role: 'member' }),
  ]);
  if (!owner) throw new Error('No manage owner user — run the server once to seed, or reset-manage.ts');
  const owners: Record<string, mongoose.Types.ObjectId> = {
    'ערן גלמור': owner._id,
    ...(member ? { 'עובד': member._id } : {}),
  };

  const docs = clients.map(({ owner: accountManager, cards, ...rest }) => ({
    ...rest,
    ownerUserId: accountManager ? owners[accountManager] : undefined,
    createdBy: owner._id,
  }));

  const existing = await Client.countDocuments();
  if (existing && !process.argv.includes('--replace')) {
    console.error(`mng_clients already has ${existing} docs — pass --replace to wipe and re-import`);
    process.exit(1);
  }

  const merged = clients.filter((c) => c.cards.length > 1);
  console.log(`${rows.length} cards → ${docs.length} clients`);
  console.log(`${merged.length} of them merged from ${merged.reduce((n, c) => n + c.cards.length, 0)} cards:`);
  merged.forEach((c) => console.log(`   ${c.name} ← ${c.cards.join(', ')} (${c.contacts.length} contacts)`));

  if (dryRun) {
    console.log('\n--- every client ---');
    clients.forEach((c) => console.log([
      c.cards.join('+'), c.name, c.status, c.tags.join('/'), c.owner,
      c.contacts.map((p) => [p.name, p.email, p.phone].filter(Boolean).join(' ')).join(' ; '),
      c.lastContactDate?.toISOString().slice(0, 10) ?? '',
    ].join(' | ')));
  }

  if (!dryRun) {
    if (existing) console.log(`🗑️  removing ${existing} existing clients`);
    await Client.deleteMany({});
    await Client.insertMany(docs);
    console.log('✅ imported');
  } else {
    console.log('(dry run — nothing written)');
  }
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
