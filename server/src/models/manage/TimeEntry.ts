import { Schema, model, Types } from 'mongoose';

export type TimeCategory =
  | 'client_project'   // work on a client project
  | 'infrastructure'   // YOOZ platform development
  | 'demo'             // building a sales demo
  | 'content'          // content writing
  | 'sales'
  | 'marketing'
  | 'admin'
  | 'support'
  | 'bizdev';

export const TIME_CATEGORIES: TimeCategory[] = [
  'client_project', 'infrastructure', 'demo', 'content',
  'sales', 'marketing', 'admin', 'support', 'bizdev',
];

/**
 * Categories that must name a project. Without this the hours land nowhere and
 * project cost is quietly understated — the failure mode is a profit number
 * that looks fine and isn't.
 */
export const CATEGORIES_REQUIRING_PROJECT: TimeCategory[] = [
  'client_project', 'infrastructure', 'demo', 'content',
];

/** Spec ch.04 §8. A day cannot hold more than this; moves to Settings later. */
export const MAX_HOURS_PER_DAY = 16;

/** A timer running longer than this is auto-stopped by the scheduled task. */
export const MAX_TIMER_HOURS = 10;

export interface ITimeEntry {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: Date;
  minutes: number;
  category: TimeCategory;
  projectId?: Types.ObjectId;
  taskId?: Types.ObjectId;
  note?: string;

  source: 'timer' | 'manual';
  startedAt?: Date;
  endedAt?: Date;

  // owner-only — stripped by serializeTimeEntry for pm/member.
  costRateSnapshot: number;
  costAmount: number;

  afterProjectClose: boolean;
  locked: boolean;
  autoStopped: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const timeEntrySchema = new Schema<ITimeEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'ManageUser', required: true },
    // Local midnight — a time entry is a day, not a moment.
    date: { type: Date, required: true },
    // Whole minutes, never decimal hours: 2.33 hours is a rounding-error factory.
    minutes: { type: Number, required: true, default: 0 },
    category: { type: String, enum: TIME_CATEGORIES, required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'ManageProject' },
    taskId: { type: Schema.Types.ObjectId, ref: 'ManageTask' },
    note: { type: String, trim: true },

    source: { type: String, enum: ['timer', 'manual'], default: 'manual' },
    startedAt: { type: Date },
    // A running timer is this document with endedAt null and minutes 0 —
    // not a separate entity. One per user, enforced in the route.
    endedAt: { type: Date },

    /**
     * Snapshot, not a live lookup. If an hourly cost changes in January and the
     * rate were computed live, every project from last year would silently
     * restate its profit. Set once at creation and never recomputed.
     */
    costRateSnapshot: { type: Number, default: 0 },
    costAmount: { type: Number, default: 0 },

    // Work that continued after the project was billed. Counted in cost as
    // normal, but visible separately (spec ch.10 decision 4).
    afterProjectClose: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
    autoStopped: { type: Boolean, default: false },
  },
  { timestamps: true },
);

timeEntrySchema.index({ userId: 1, date: -1 });
timeEntrySchema.index({ projectId: 1, date: -1 });
timeEntrySchema.index({ date: -1, category: 1 });
timeEntrySchema.index({ taskId: 1 });
// Finds a user's running timer in one hit.
timeEntrySchema.index({ userId: 1, endedAt: 1 });

export const TimeEntry = model<ITimeEntry>('ManageTimeEntry', timeEntrySchema, 'mng_time_entries');
