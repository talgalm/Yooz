import { Schema, model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type PortalUserStatus = 'pending' | 'approved' | 'denied';

export interface IPortalUser {
  _id?: Types.ObjectId;
  username: string;
  password: string; // bcrypt hash
  status: PortalUserStatus;
  mustChangePassword?: boolean;
  createdAt: Date;
}

export interface IPortal {
  _id: Types.ObjectId;
  name: string;
  code: string; // unique URL slug for portal access
  description?: string;
  users: IPortalUser[];
  activities: Types.ObjectId[];
  createdAt: Date;
  createdByEmail?: string;
}

function generatePortalCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const portalUserSchema = new Schema<IPortalUser>({
  username: { type: String, required: true },
  password: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'approved' },
  mustChangePassword: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
portalUserSchema.pre('validate', async function () {
  if (this.isModified('password') && this.password && !this.password.startsWith('$2')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

const portalSchema = new Schema<IPortal>({
  name: { type: String, required: true },
  code: { type: String, required: true, default: generatePortalCode },
  description: { type: String },
  users: { type: [portalUserSchema], default: [] },
  activities: [{ type: Schema.Types.ObjectId, ref: 'Activity' }],
  createdAt: { type: Date, default: Date.now },
  createdByEmail: { type: String, lowercase: true, trim: true },
});

portalSchema.index({ code: 1 }, { unique: true });
portalSchema.index({ name: 'text', description: 'text' });

export const Portal = model<IPortal>('Portal', portalSchema, 'portals');
