import { test } from 'node:test';
import assert from 'node:assert';
import { splitCard, parseDate, mapStatus, buildClients } from './import-kaveret-clients';

const row = (over: Record<string, string>) => ({
  'כרטיס // מספר': '', 'לקוח': 'לא', 'מנהל תיק': 'ערן גלמור', 'איש קשר': '', 'כתובת': '',
  'מיילים': '', 'טלפונים': '', 'פעיל': 'כן', 'התקשרות אחרונה': '', 'סטטוס': '', ...over,
});

test('splitCard strips the card number and leading punctuation', () => {
  assert.deepStrictEqual(splitCard('Blue Kit /// 81'), { name: 'Blue Kit', number: '81' });
  assert.deepStrictEqual(splitCard(", Kubb 'משחק /// 103"), { name: "Kubb 'משחק", number: '103' });
  assert.deepStrictEqual(splitCard('no number'), { name: 'no number', number: '' });
});

test('parseDate fills in the export year for bare dd/MM', () => {
  assert.strictEqual(parseDate('04/06/2025')?.toISOString(), '2025-06-04T00:00:00.000Z');
  assert.strictEqual(parseDate('03/05')?.toISOString(), '2026-05-03T00:00:00.000Z');
  assert.strictEqual(parseDate(''), undefined);
});

test('mapStatus', () => {
  assert.strictEqual(mapStatus('כן', '', 'כן'), 'active');
  assert.strictEqual(mapStatus('לא', 'לקוח חדש', 'כן'), 'active');
  assert.strictEqual(mapStatus('לא', 'פולואפ', 'כן'), 'prospect');
  assert.strictEqual(mapStatus('לא', 'לא רלוונטי', 'כן'), 'irrelevant');
  assert.strictEqual(mapStatus('כן', '', 'לא'), 'past');
});

test('cards of one organisation merge into a client holding every person', () => {
  const [client, ...rest] = buildClients([
    row({ 'כרטיס // מספר': 'סיעוד-אוניברסיטת חיפה /// 127', 'איש קשר': 'רועי', 'מיילים': 'roy@x.com', 'סטטוס': 'פולואפ', 'התקשרות אחרונה': '01/03' }),
    row({ 'כרטיס // מספר': 'אוניברסיטת חיפה - החוג לסיעוד /// 114', 'איש קשר': 'רועי צמח', 'מיילים': 'roy@x.com' }),
    row({ 'כרטיס // מספר': 'סיעוד -אוניברסיטת חיפה /// 126', 'איש קשר': 'תמר', 'מיילים': 'tamar@x.com', 'לקוח': 'כן', 'מנהל תיק': 'עובד', 'התקשרות אחרונה': '20/04' }),
  ]);
  assert.strictEqual(rest.length, 0);
  assert.strictEqual(client.name, 'סיעוד - אוניברסיטת חיפה');
  assert.deepStrictEqual(client.contacts.map((c) => c.name), ['רועי', 'תמר']);
  assert.strictEqual(client.contacts[0].isPrimary, true);
  assert.strictEqual(client.status, 'active');
  assert.strictEqual(client.owner, 'ערן גלמור');
  assert.strictEqual(client.lastContactDate?.toISOString(), '2026-04-20T00:00:00.000Z');
  assert.deepStrictEqual(client.tags, ['פולואפ']);
});

test('punctuation-only spelling differences merge, and the untruncated name wins', () => {
  const clients = buildClients([
    row({ 'כרטיס // מספר': 'קק"ל /// 70', 'איש קשר': 'מירב' }),
    row({ 'כרטיס // מספר': 'קקל /// 90', 'איש קשר': 'ארנון' }),
    row({ 'כרטיס // מספר': 'מכללת בית ברל... /// 200', 'איש קשר': 'א' }),
    row({ 'כרטיס // מספר': 'מכללת בית ברל /// 201', 'איש קשר': 'ב' }),
  ]);
  assert.deepStrictEqual(clients.map((c) => c.name), ['קק"ל', 'מכללת בית ברל']);
  assert.deepStrictEqual(clients.map((c) => c.contacts.length), [2, 2]);
});
