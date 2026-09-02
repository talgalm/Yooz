import { Schema, model, Types } from 'mongoose';

export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected' | 'done';

export const CHANGE_REQUEST_STATUSES: ChangeRequestStatus[] = ['pending', 'approved', 'rejected', 'done'];

/**
 * Something the client asked for after the scope was agreed.
 *
 * Without this the profitability figure lies: if a client asks for a fourth game
 * and the system does not know, the project reads as "over budget" when it
 * actually just got bigger. Approving one adds its hours to the project budget
 * and its price to revenue.
 *
 * `additionalPrice` is owner-only. The hours and the description are visible to
 * everyone — the team needs to know the work grew.
 */
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
  /** Guards against a double-approve adding the same hours to the budget twice. */
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
