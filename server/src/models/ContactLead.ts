import { Schema, model, Types } from 'mongoose';

export interface IContactLead {
  _id: Types.ObjectId;
  name: string;
  company?: string;
  position?: string;
  email: string;
  /** Optional: the marketing contact form collects name, email and company only. */
  phone?: string;
  message?: string;
  handled: boolean;
  createdAt: Date;
}

const contactLeadSchema = new Schema<IContactLead>({
  name: { type: String, required: true, trim: true },
  company: { type: String, trim: true },
  position: { type: String, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  message: { type: String, trim: true },
  handled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const ContactLead = model<IContactLead>('ContactLead', contactLeadSchema, 'contactLeads');
