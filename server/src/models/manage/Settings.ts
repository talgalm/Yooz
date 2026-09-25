import { Schema, model, Types } from 'mongoose';
import { DEFAULT_STAGE_TEMPLATE } from '../../services/manageMetrics';
import { TIME_CATEGORIES, CATEGORIES_REQUIRING_PROJECT, MAX_HOURS_PER_DAY } from './TimeEntry';

export interface IStageTemplateEntry { key: string; name: string; percent: number }

export interface ITimeCategorySetting {
  key: string;
  label: string;
  requiresProject: boolean;
}

export interface ISettings {
  _id: Types.ObjectId;
  singleton: 'settings';

  stageTemplate: IStageTemplateEntry[];
  timeCategories: ITimeCategorySetting[];

  thresholds: {
    nearBudget: number;
    overBudget: number;
    lowProgress: number;
    staleClientDays: number;
    contractEndingDays: number;
  };

  defaults: {
    weeklyCapacityHours: number;
    employerCostFactor: number;
    maxHoursPerDay: number;
  };

  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    singleton: { type: String, default: 'settings', unique: true, enum: ['settings'] },

    stageTemplate: {
      type: [{ key: String, name: String, percent: Number }],
      default: () => DEFAULT_STAGE_TEMPLATE,
    },
    timeCategories: {
      type: [{ key: String, label: String, requiresProject: Boolean }],
      default: () => TIME_CATEGORIES.map((key) => ({
        key,
        label: key,
        requiresProject: CATEGORIES_REQUIRING_PROJECT.includes(key),
      })),
    },

    thresholds: {
      nearBudget: { type: Number, default: 0.85 },
      overBudget: { type: Number, default: 1.0 },
      lowProgress: { type: Number, default: 0.7 },
      staleClientDays: { type: Number, default: 30 },
      contractEndingDays: { type: Number, default: 90 },
    },

    defaults: {
      weeklyCapacityHours: { type: Number, default: 40 },
      employerCostFactor: { type: Number, default: 0.25 },
      maxHoursPerDay: { type: Number, default: MAX_HOURS_PER_DAY },
    },
  },
  { timestamps: true },
);

export const Settings = model<ISettings>('ManageSettings', settingsSchema, 'mng_settings');
