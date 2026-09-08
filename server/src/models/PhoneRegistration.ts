import { Schema, model, Types } from 'mongoose';

export interface IPhoneRegistration {
  _id?: Types.ObjectId;
  /** Normalized digits — see `utils/phone.ts`. */
  phone: string;
  /** Activity this registration is for; `null` = every activity with
   *  `userControl` on, including ones created after the registration. */
  activityCode: string | null;
  /** Israel calendar day (YYYY-MM-DD) the phone may play on. One day only —
   *  the caller either names it or gets today's. */
  activityDay: string;
  createdAt: Date;
}

const phoneRegistrationSchema = new Schema<IPhoneRegistration>({
  phone: { type: String, required: true },
  activityCode: { type: String, default: null },
  activityDay: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Also the lookup index for the group-creation gate, which queries
// phone + day and then picks the code out.
phoneRegistrationSchema.index({ phone: 1, activityDay: 1, activityCode: 1 }, { unique: true });

export const PhoneRegistration = model<IPhoneRegistration>('PhoneRegistration', phoneRegistrationSchema, 'phone_registrations');
