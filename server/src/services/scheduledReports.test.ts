import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeReportsSnapshot, sameIsraelHour } from './scheduledReports';
import type { ExportReport } from '../utils/analyticsExcelExport';

function report(overrides: Partial<ExportReport>): ExportReport {
  return { participantName: 'Dana', completionStatus: 'completed', data: { totalScore: 80 }, ...overrides };
}

test('computeReportsSnapshot is stable for unchanged data and changes when data changes', () => {
  const reports = [report({ participantName: 'Dana' }), report({ participantName: 'Noa', data: { totalScore: 60 } })];
  const again = [report({ participantName: 'Dana' }), report({ participantName: 'Noa', data: { totalScore: 60 } })];
  assert.equal(computeReportsSnapshot(reports), computeReportsSnapshot(again));

  const scoreChanged = [report({ participantName: 'Dana' }), report({ participantName: 'Noa', data: { totalScore: 61 } })];
  assert.notEqual(computeReportsSnapshot(reports), computeReportsSnapshot(scoreChanged));

  const newParticipant = [...reports, report({ participantName: 'Yossi' })];
  assert.notEqual(computeReportsSnapshot(reports), computeReportsSnapshot(newParticipant));
});

test('computeReportsSnapshot does not depend on report order', () => {
  const a = [report({ participantName: 'Dana' }), report({ participantName: 'Noa' })];
  const b = [report({ participantName: 'Noa' }), report({ participantName: 'Dana' })];
  assert.equal(computeReportsSnapshot(a), computeReportsSnapshot(b));
});

test('sameIsraelHour: two instants minutes apart in the same hour are the same hour', () => {
  assert.equal(
    sameIsraelHour(new Date('2026-09-23T06:05:00Z'), new Date('2026-09-23T06:55:00Z')),
    true,
  );
});

test('sameIsraelHour: same hour-of-day on a different Israel day is not the same hour', () => {
  assert.equal(
    sameIsraelHour(new Date('2026-09-22T06:05:00Z'), new Date('2026-09-23T06:05:00Z')),
    false,
  );
});

test('sameIsraelHour: same day, different hour is not the same hour', () => {
  assert.equal(
    sameIsraelHour(new Date('2026-09-23T06:05:00Z'), new Date('2026-09-23T07:05:00Z')),
    false,
  );
});
