import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { buildAnalyticsWorkbookBuffer, formatDuration, typicalDurations, type ExportActivity, type ExportReport } from './analyticsExcelExport';

const MINUTE = 60_000;

function result(itemIndex: number, itemName: string, extra: Record<string, unknown> = {}) {
  return { itemIndex, itemName, itemType: 'station', score: 0, durationMs: 30_000, completedAt: new Date(), ...extra };
}

function report(name: string, minutes: number, status: 'completed' | 'in_progress' | 'joined', extra: Partial<ExportReport> = {}): ExportReport {
  return {
    participantName: name,
    completionStatus: status,
    sessionDurationMs: minutes * MINUTE,
    totalItemsCompleted: status === 'completed' ? 2 : 1,
    totalItemsInModule: 2,
    data: {
      totalScore: 80,
      itemResults: [
        result(0, 'הקדמה'),
        result(1, 'חידה', {
          itemType: 'game', score: 80, maxPossibleScore: 100,
          metadata: { feedbackType: 'rating_6_level', answers: [{ questionIndex: 0, questionText: 'נהניתם?', value: 6, label: 'במידה רבה מאוד' }], averageRating: 6 },
        }),
      ],
    },
    ...extra,
  };
}

async function workbookFor(activity: ExportActivity, reports: ExportReport[]) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await buildAnalyticsWorkbookBuffer(activity, reports, 'executive')) as unknown as ExcelJS.Buffer);
  return workbook;
}

function cellTexts(workbook: ExcelJS.Workbook): string[] {
  const texts: string[] = [];
  workbook.eachSheet((sheet) => sheet.eachRow((row) => row.eachCell((cell) => texts.push(String(cell.value ?? '')))));
  return texts;
}

test('durations skip the near-zero and the left-open sessions', () => {
  const kept = typicalDurations([400, 20 * MINUTE, 25 * MINUTE, 30 * MINUTE, 35 * MINUTE, 138 * MINUTE, 0]);
  assert.deepEqual(kept, [20, 25, 30, 35].map((m) => m * MINUTE));
  assert.equal(formatDuration(400), '');
  assert.equal(formatDuration(45_000), '45 שניות');
  assert.equal(formatDuration(25 * MINUTE + 5_000), '25:05 דקות');
  assert.equal(formatDuration(138 * MINUTE + 40_000), '2:18 שעות');
});

test('an activity without groups has no group column or sheet, and no long dashes', async () => {
  const activity: ExportActivity = { name: 'פעילות', code: 'abc', status: 'active', connectionType: 'single', module: { type: 'story', items: [{}, {}] } };
  const reports = [
    report('א', 20, 'completed'), report('ב', 25, 'completed'), report('ג', 30, 'completed'),
    report('ד', 35, 'completed'), report('ה', 0.01, 'completed'), report('ו', 140, 'completed'), report('ז', 5, 'in_progress'),
  ];
  const workbook = await workbookFor(activity, reports);
  assert.equal(workbook.getWorksheet('קבוצות'), undefined);
  const participants = workbook.getWorksheet('משתתפים')!;
  const headers = (participants.getRow(4).values as unknown[]).map(String);
  assert.ok(!headers.includes('קבוצה'));
  assert.ok(cellTexts(workbook).every((text) => !/[—–]/.test(text)));

  const summary = workbook.getWorksheet('תקציר מנהלים')!;
  assert.equal(summary.getCell(9, 1).value, '20 דקות');
  assert.equal(summary.getCell(10, 1).value, 'הארוך ביותר 35 דקות | בלי ערכים חריגים');
  const texts = cellTexts(workbook);
  assert.ok(!texts.some((text) => text.includes('הקדמה') && text.includes('הצלחה')));
  assert.ok(!texts.some((text) => text.includes('תקועים')));

  const valueHeader = summary.getRow(14).getCell(2);
  assert.equal(valueHeader.value, 'ערך');
  assert.equal(summary.getRow(15).getCell(2).alignment?.horizontal, 'center');
});

test('a station without points gets no score column and no zero score', async () => {
  const activity: ExportActivity = { name: 'ציונים', code: 'sc', status: 'active', connectionType: 'single', module: { type: 'story', items: [{}, {}] } };
  const workbook = await workbookFor(activity, [report('א', 20, 'completed'), report('ב', 22, 'completed')]);
  const scoreHeaders = (workbook.getWorksheet('ציונים')!.getRow(4).values as unknown[]).map(String);
  assert.ok(scoreHeaders.some((header) => header.includes('חידה')));
  assert.ok(!scoreHeaders.some((header) => header.includes('הקדמה')));
  const items = workbook.getWorksheet('תחנות')!;
  const headers = (items.getRow(4).values as unknown[]).map(String);
  const intro = items.getRow(5);
  assert.equal(intro.getCell(2).value, 'הקדמה');
  assert.equal(intro.getCell(headers.indexOf('ציון ממוצע (0-100)')).value, '');
  assert.equal(intro.getCell(headers.indexOf('שימוש ברמז %')).value, '');
});

test('a group activity keeps the groups sheet', async () => {
  const activity: ExportActivity = { name: 'קבוצות', code: 'grp', status: 'active', connectionType: 'group', module: { type: 'story', items: [{}, {}] } };
  const workbook = await workbookFor(activity, [report('א', 20, 'completed', { group: 'אדומים' }), report('ב', 22, 'completed', { group: 'כחולים' })]);
  assert.ok(workbook.getWorksheet('קבוצות'));
});

test('feedback answers are painted by their level', async () => {
  const activity: ExportActivity = { name: 'משוב', code: 'fb', status: 'active', connectionType: 'single', module: { type: 'story', items: [{}, {}] } };
  const workbook = await workbookFor(activity, [report('א', 20, 'completed'), report('ב', 21, 'completed')]);
  const sheet = workbook.getWorksheet('משוב')!;
  let painted = 0;
  sheet.eachRow((row) => row.eachCell((cell) => {
    if (cell.value === 'במידה רבה מאוד' && (cell.fill as ExcelJS.FillPattern)?.fgColor?.argb) painted += 1;
  }));
  assert.equal(painted, 2);
});
