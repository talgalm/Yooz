import { Schema, model, Types } from 'mongoose';

export type ManageRole = 'owner' | 'pm' | 'member';

export interface IManageUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: ManageRole;
  phone?: string;
  color: string;
  active: boolean;

  weeklyCapacityHours: number;
  workDays: number[];
  tracksTime: boolean;

  hourlyCost: number;
  employerCostFactor: number;

  startDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const manageUserSchema = new Schema<IManageUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['owner', 'pm', 'member'], default: 'member' },
    phone: { type: String, trim: true },
    color: { type: String, default: '#6c5ce7' },
    active: { type: Boolean, default: true },

    weeklyCapacityHours: { type: Number, default: 40 },
    workDays: { type: [Number], default: [0, 1, 2, 3, 4] },
    tracksTime: { type: Boolean, default: true },

    hourlyCost: { type: Number, default: 0 },
    employerCostFactor: { type: Number, default: 0.25 },

    startDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true },
);

manageUserSchema.index({ active: 1, name: 1 });

export const ManageUser = model<IManageUser>('ManageUser', manageUserSchema, 'mng_users');

export function effectiveHourlyCost(u: Pick<IManageUser, 'hourlyCost' | 'employerCostFactor'>): number {
  return Math.round(u.hourlyCost * 100) / 100;
}
