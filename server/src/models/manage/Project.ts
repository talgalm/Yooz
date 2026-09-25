import { Schema, model, Types } from 'mongoose';

export type ProjectType = 'client' | 'internal' | 'demo';
export type ProjectStatus =
  | 'planned' | 'active' | 'on_hold' | 'waiting_client' | 'done' | 'cancelled' | 'maintenance';
export type ProjectHealth = 'green' | 'orange' | 'red';
export type StageStatus = 'not_started' | 'in_progress' | 'done' | 'skipped';

export const PROJECT_TYPES: ProjectType[] = ['client', 'internal', 'demo'];
export const PROJECT_STATUSES: ProjectStatus[] = [
  'planned', 'active', 'on_hold', 'waiting_client', 'done', 'cancelled', 'maintenance',
];
export const INTERNAL_PROJECT_NAME = 'פנימי';

export const STAGE_STATUSES: StageStatus[] = ['not_started', 'in_progress', 'done', 'skipped'];

export interface IStage {
  key: string;
  name: string;
  order: number;
  plannedHours: number;
  status: StageStatus;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface IPaymentMilestone {
  _id: Types.ObjectId;
  label: string;
  amount: number;
  plannedDate?: Date;
  invoiced: boolean;
  invoicedAt?: Date;
  paid: boolean;
  paidAt?: Date;
  note?: string;
}

export interface IProject {
  _id: Types.ObjectId;
  name: string;
  type: ProjectType;
  clientId?: Types.ObjectId;
  primaryContactId?: Types.ObjectId;
  description?: string;

  status: ProjectStatus;
  stages: IStage[];
  currentStageKey?: string;

  pmUserId: Types.ObjectId;
  memberUserIds: Types.ObjectId[];

  startDate?: Date;
  targetDate?: Date;
  goLiveDate?: Date;
  closedAt?: Date;

  plannedHours: number;

  agreedPrice: number;
  currency: string;
  contract: {
    signedDate?: Date;
    startDate?: Date;
    endDate?: Date;
    terms?: string;
    documentUrl?: string;
    noticePeriodDays?: number;
  };
  recurring: {
    enabled: boolean;
    monthlyAmount: number;
    billingDay: number;
    startDate?: Date;
    endDate?: Date;
    autoRenew: boolean;
  };
  paymentMilestones: IPaymentMilestone[];

  health: ProjectHealth;
  healthReason?: string;
  driveUrl?: string;
  tags: string[];
  archived: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stageSchema = new Schema<IStage>({
  key: { type: String, required: true },
  name: { type: String, required: true },
  order: { type: Number, required: true },
  plannedHours: { type: Number, default: 0 },
  status: { type: String, enum: STAGE_STATUSES, default: 'not_started' },
  plannedStartDate: { type: Date },
  plannedEndDate: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },
}, { _id: false });

const paymentMilestoneSchema = new Schema<IPaymentMilestone>({
  label: { type: String, required: true },
  amount: { type: Number, default: 0 },
  plannedDate: { type: Date },
  invoiced: { type: Boolean, default: false },
  invoicedAt: { type: Date },
  paid: { type: Boolean, default: false },
  paidAt: { type: Date },
  note: { type: String },
});

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: PROJECT_TYPES, default: 'client' },
    clientId: { type: Schema.Types.ObjectId, ref: 'ManageClient' },
    primaryContactId: { type: Schema.Types.ObjectId },
    description: { type: String },

    status: { type: String, enum: PROJECT_STATUSES, default: 'planned' },
    stages: { type: [stageSchema], default: [] },
    currentStageKey: { type: String },

    pmUserId: { type: Schema.Types.ObjectId, ref: 'ManageUser', required: true },
    memberUserIds: { type: [Schema.Types.ObjectId], ref: 'ManageUser', default: [] },

    startDate: { type: Date },
    targetDate: { type: Date },
    goLiveDate: { type: Date },
    closedAt: { type: Date },

    plannedHours: { type: Number, default: 0 },

    agreedPrice: { type: Number, default: 0 },
    currency: { type: String, default: 'ILS' },
    contract: {
      signedDate: { type: Date },
      startDate: { type: Date },
      endDate: { type: Date },
      terms: { type: String },
      documentUrl: { type: String },
      noticePeriodDays: { type: Number },
    },
    recurring: {
      enabled: { type: Boolean, default: false },
      monthlyAmount: { type: Number, default: 0 },
      billingDay: { type: Number, default: 1, min: 1, max: 28 },
      startDate: { type: Date },
      endDate: { type: Date },
      autoRenew: { type: Boolean, default: false },
    },
    paymentMilestones: { type: [paymentMilestoneSchema], default: [] },

    health: { type: String, enum: ['green', 'orange', 'red'], default: 'green' },
    healthReason: { type: String },
    driveUrl: { type: String, trim: true },
    tags: { type: [String], default: [] },
    archived: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'ManageUser', required: true },
  },
  { timestamps: true },
);

projectSchema.index({ status: 1, type: 1 });
projectSchema.index({ clientId: 1 });
projectSchema.index({ pmUserId: 1 });
projectSchema.index({ memberUserIds: 1 });
projectSchema.index({ 'recurring.enabled': 1, 'recurring.endDate': 1 });
projectSchema.index({ 'contract.endDate': 1 });

export const Project = model<IProject>('ManageProject', projectSchema, 'mng_projects');
