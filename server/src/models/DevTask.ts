import { Schema, model, Types } from 'mongoose';

export type DevTaskType = 'feature' | 'bug' | 'change';
export type DevTaskStatus = 'open' | 'in_progress' | 'done' | 'closed';

export interface IDevTask {
  _id: Types.ObjectId;
  type: DevTaskType;
  description: string;
  status: DevTaskStatus;
  createdBy: string;
  createdByName?: string;
  route?: string;
  documentUrl?: string;
  documentName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const devTaskSchema = new Schema<IDevTask>({
  type: { type: String, required: true, enum: ['feature', 'bug', 'change'] },
  description: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'done', 'closed'],
    default: 'open',
  },
  createdBy: { type: String, required: true },
  createdByName: { type: String, trim: true },
  route: { type: String, trim: true },
  documentUrl: { type: String, trim: true },
  documentName: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

devTaskSchema.index({ status: 1, createdAt: -1 });
devTaskSchema.index({ type: 1, createdAt: -1 });

export const DevTask = model<IDevTask>('DevTask', devTaskSchema, 'dev_tasks');
