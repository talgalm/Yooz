import { Schema, model, Types } from 'mongoose';

export type UserRole = 'viewer' | 'admin' | 'super_admin';

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  password?: string;
  role: UserRole;
  googleId?: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String },
  role: { type: String, required: true, enum: ['viewer', 'admin', 'super_admin'], default: 'viewer' },
  googleId: { type: String },
  name: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const User = model<IUser>('User', userSchema, 'users');
