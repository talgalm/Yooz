import assert from 'assert';
import { projectMoney, recurringToDate, monthsElapsed, mrrOf } from './manageMoney';
import { IProject } from '../models/manage/Project';

const noRecurring = { enabled: false, monthlyAmount: 0, billingDay: 1, autoRenew: false } as IProject['recurring'];

const example = projectMoney(
  { agreedPrice: 28000, recurring: noRecurring },
  { laborCost: 9800, expenseTotal: 2000 + 800 + 1500, changeRequestRevenue: 0, actualHours: 92 },
);
assert.strictEqual(example.totalCost, 14100, 'total cost');
assert.strictEqual(example.grossProfit, 13900, 'gross profit');
assert.strictEqual(Math.round(example.margin * 1000) / 10, 49.6, 'margin is 49.6%');
assert.strictEqual(example.excludesManagementHours, true, 'the caveat flag must always be set');
assert.strictEqual(example.effectiveRatePerHour, round2(28000 / 92), 'effective rate per hour');

function round2(n: number) { return Math.round(n * 100) / 100; }

const empty = projectMoney(
  { agreedPrice: 0, recurring: noRecurring },
  { laborCost: 0, expenseTotal: 0, changeRequestRevenue: 0, actualHours: 0 },
);
assert.strictEqual(empty.margin, 0, 'no revenue = 0% margin, not NaN');
assert.strictEqual(empty.effectiveRatePerHour, 0, 'no hours = 0 rate, not Infinity');
assert.ok(Number.isFinite(empty.grossProfit));

const loss = projectMoney(
  { agreedPrice: 1000, recurring: noRecurring },
  { laborCost: 3000, expenseTotal: 0, changeRequestRevenue: 0, actualHours: 10 },
);
assert.strictEqual(loss.grossProfit, -2000, 'a loss stays negative');
assert.strictEqual(loss.margin, -2, 'margin can be negative');

const withCr = projectMoney(
  { agreedPrice: 28000, recurring: noRecurring },
  { laborCost: 9800, expenseTotal: 4300, changeRequestRevenue: 2000, actualHours: 92 },
);
assert.strictEqual(withCr.oneTimeRevenue, 30000, 'approved change requests add to revenue');
assert.strictEqual(withCr.grossProfit, 15900);

assert.strictEqual(monthsElapsed(new Date('2026-01-15'), new Date('2026-01-14')), 0, 'not a month yet');
assert.strictEqual(monthsElapsed(new Date('2026-01-15'), new Date('2026-01-15')), 1, 'day-of-month reached');
assert.strictEqual(monthsElapsed(new Date('2026-01-15'), new Date('2026-06-15')), 6);
assert.strictEqual(monthsElapsed(new Date('2026-01-15'), new Date('2026-06-14')), 5, 'one day short');
assert.strictEqual(monthsElapsed(new Date('2026-06-01'), new Date('2026-01-01')), 0, 'future start floors at 0');

const retainer = {
  enabled: true, monthlyAmount: 4500, billingDay: 1, autoRenew: false,
  startDate: new Date('2026-01-01'),
} as IProject['recurring'];
assert.strictEqual(recurringToDate(retainer, new Date('2026-06-01')), 4500 * 6);
assert.strictEqual(recurringToDate(undefined, new Date()), 0, 'no recurring block = 0');
assert.strictEqual(
  recurringToDate({ ...retainer, enabled: false }, new Date('2026-06-01')),
  0,
  'disabled recurring = 0',
);
assert.strictEqual(
  recurringToDate({ ...retainer, endDate: new Date('2026-03-01') }, new Date('2026-12-01')),
  4500 * 3,
  'accrual stops at the contract end date',
);
assert.ok(
  recurringToDate({ ...retainer, endDate: new Date('2026-03-01') }, new Date('2026-12-01'))
    < recurringToDate(retainer, new Date('2026-12-01')),
  'an ended contract must accrue strictly less than an open one',
);
assert.strictEqual(
  recurringToDate({ ...retainer, startDate: new Date('2027-01-01') }, new Date('2026-06-01')),
  0,
  'a contract that has not started yet earns nothing',
);

const p = (status: string, enabled: boolean, amount: number, endDate?: Date) => ({
  status, recurring: { enabled, monthlyAmount: amount, billingDay: 1, autoRenew: false, endDate },
} as unknown as IProject);

const now = new Date('2026-09-01');
assert.strictEqual(
  mrrOf([p('active', true, 4500), p('maintenance', true, 3000), p('planned', true, 9999)], now),
  7500,
  'only active and maintenance count',
);
assert.strictEqual(mrrOf([p('active', false, 4500)], now), 0, 'disabled recurring is not MRR');
assert.strictEqual(
  mrrOf([p('active', true, 4500, new Date('2026-08-01'))], now),
  0,
  'a contract whose end date has passed is not MRR',
);
assert.strictEqual(
  mrrOf([p('active', true, 4500, new Date('2027-01-01'))], now),
  4500,
  'a future end date still counts',
);
assert.strictEqual(mrrOf([], now), 0);

console.log('✅ manageMoney self-check passed');
