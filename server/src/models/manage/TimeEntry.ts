import { Schema, model, Types } from 'mongoose';

export type TimeCategory =
  | 'client_project'
  | 'infrastructure'
  | 'demo'
  | 'content'
  | 'sales'
  | 'marketing'
  | 'admin'
  | 'support'
  | 'bizdev';

export const TIME_CATEGORIES: TimeCategory[] = [
  'client_project', 'infrastructure', 'demo', 'content',
  'sales', 'marketing', 'admin', 'support', 'bizdev',
];

export const CATEGORIES_REQUIRING_PROJECT: TimeCategory[] = [
  'client_project', 'infrastructure', 'demo', 'content',
];

export const MAX_HOURS_PER_DAY = 16;

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
    date: { type: Date, required: true },
    minutes: { type: Number, required: true, default: 0 },
    category: { type: String, enum: TIME_CATEGORIES, required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'ManageProject' },
    taskId: { type: Schema.Types.ObjectId, ref: 'ManageTask' },
    note: { type: String, trim: true },

    source: { type: String, enum: ['timer', 'manual'], default: 'manual' },
    startedAt: { type: Date },
    endedAt: { type: Date },

    costRateSnapshot: { type: Number, default: 0 },
    costAmount: { type: Number, default: 0 },

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
timeEntrySchema.index({ userId: 1, endedAt: 1 });

export const TimeEntry = model<ITimeEntry>('ManageTimeEntry', timeEntrySchema, 'mng_time_entries');
