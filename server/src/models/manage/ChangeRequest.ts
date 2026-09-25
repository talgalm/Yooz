import { Schema, model, Types } from 'mongoose';

export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected' | 'done';

export const CHANGE_REQUEST_STATUSES: ChangeRequestStatus[] = ['pending', 'approved', 'rejected', 'done'];

export interface IChangeRequest {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  date: Date;
  requestedByContactId?: Types.ObjectId;
  requestedByName?: string;
  description: string;
  estimatedHours: number;
  additionalPrice: number;
  status: ChangeRequestStatus;
  approvedAt?: Date;
  appliedToBudget: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const changeRequestSchema = new Schema<IChangeRequest>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'ManageProject', required: true },
    date: { type: Date, required: true, default: Date.now },
    requestedByContactId: { type: Schema.Types.ObjectId },
    requestedByName: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    estimatedHours: { type: Number, default: 0 },
    additionalPrice: { type: Number, default: 0 },
    status: { type: String, enum: CHANGE_REQUEST_STATUSES, default: 'pending' },
    approvedAt: { type: Date },
    appliedToBudget: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'ManageUser', required: true },
  },
  { timestamps: true },
);

changeRequestSchema.index({ projectId: 1, date: -1 });
changeRequestSchema.index({ status: 1, date: -1 });

export const ChangeRequest = model<IChangeRequest>('ManageChangeRequest', changeRequestSchema, 'mng_change_requests');
