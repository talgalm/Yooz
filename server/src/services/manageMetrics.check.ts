import assert from 'assert';
import {
  DEFAULT_STAGE_TEMPLATE, buildStages, canTransition, projectHealth, projectHours, round1,
} from './manageMetrics';
import { IProject } from '../models/manage/Project';

const totalPercent = DEFAULT_STAGE_TEMPLATE.reduce((a, s) => a + s.percent, 0);
assert.strictEqual(totalPercent, 100, 'stage template percentages must sum to 100');

const stages = buildStages(120);
assert.strictEqual(stages.length, 9, 'template yields nine stages');
assert.strictEqual(
  round1(stages.reduce((a, s) => a + s.plannedHours, 0)),
  120,
  'stage hours must add up to the project total',
);
assert.strictEqual(stages[0].plannedHours, 12, 'spec stage is 10% of 120');
assert.strictEqual(stages[4].plannedHours, 42, 'development stage is 35% of 120');
assert.strictEqual(stages[8].plannedHours, 0, 'maintenance defaults to 0%');
assert.strictEqual(stages[0].order, 1, 'stages are ordered from 1');

for (const total of [0, 1, 7, 33, 99.5, 250]) {
  const s = buildStages(total);
  assert.strictEqual(round1(s.reduce((a, x) => a + x.plannedHours, 0)), round1(total),
    `stage hours must sum to ${total}`);
}

assert.ok(canTransition('planned', 'active'));
assert.ok(canTransition('active', 'done'));
assert.ok(canTransition('done', 'maintenance'));
assert.ok(!canTransition('planned', 'done'), 'planned cannot jump straight to done');
assert.ok(!canTransition('cancelled', 'active'), 'cancelled is terminal');
assert.ok(canTransition('active', 'active'), 'a no-op transition is allowed');

const base = { _id: 'x', status: 'active', plannedHours: 100, targetDate: undefined } as unknown as IProject;
const now = new Date('2026-09-01T00:00:00Z');

assert.strictEqual(projectHealth(base, 0, now).health, 'green', 'no signals = green');

assert.strictEqual(
  projectHealth({ ...base, status: 'done', targetDate: new Date('2020-01-01') } as never, 5, now).health,
  'green',
  'a finished project is green even with an overdue task and a passed target',
);

assert.strictEqual(
  projectHealth({ ...base, targetDate: new Date('2026-08-01') } as never, 0, now).health,
  'red',
  'past target date is red',
);

assert.strictEqual(
  projectHealth({ ...base, targetDate: new Date('2026-09-05') } as never, 0, now).health,
  'orange',
  'a week to target with under 70% done is orange',
);

assert.strictEqual(projectHealth(base, 2, now).health, 'orange', 'overdue tasks are orange');

const zeroBudget = projectHours({ _id: 'x', plannedHours: 0 } as never);
assert.strictEqual(zeroBudget.utilization, 0, 'no budget = 0% utilization, not Infinity');
assert.ok(Number.isFinite(zeroBudget.remainingHours));

console.log('✅ manageMetrics self-check passed');
