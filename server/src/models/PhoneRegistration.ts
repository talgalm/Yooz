import { Schema, model, Types } from 'mongoose';

export interface IPhoneRegistration {
  _id?: Types.ObjectId;
  phone: string;
  activityCode: string | null;
  activityDay: string;
  createdAt: Date;
}

const phoneRegistrationSchema = new Schema<IPhoneRegistration>({
  phone: { type: String, required: true },
  activityCode: { type: String, default: null },
  activityDay: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

phoneRegistrationSchema.index({ phone: 1, activityDay: 1, activityCode: 1 }, { unique: true });

export const PhoneRegistration = model<IPhoneRegistration>('PhoneRegistration', phoneRegistrationSchema, 'phone_registrations');
