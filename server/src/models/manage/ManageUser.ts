import { Schema, model, Types } from 'mongoose';

/**
 * Yooz-Manage realm (/manage) — internal business-management users.
 * Deliberately separate from the platform `users` collection: these documents
 * carry salary cost, and nothing in the Yooz admin realm should ever load them.
 */
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

  // Capacity & time reporting
  weeklyCapacityHours: number;
  workDays: number[]; // 0 = Sunday .. 6 = Saturday
  tracksTime: boolean;

  // owner-only — never leaves the server for pm/member
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

/**
 * Cost per hour. Derived, never stored.
 *
 * The employer-overhead factor is temporarily NOT applied — the field and its
 * stored values are kept, so restoring it is putting the multiplier back here
 * and re-showing the three inputs (employees modal, finance rates, settings
 * defaults). Every cost path goes through this function, so this is the only
 * place that decides.
 */
export function effectiveHourlyCost(u: Pick<IManageUser, 'hourlyCost' | 'employerCostFactor'>): number {
  return Math.round(u.hourlyCost * 100) / 100;
}
