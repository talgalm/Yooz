import { Schema, model, Types } from 'mongoose';

export type ClientDomain = 'tourism' | 'academia' | 'organization' | 'other';
export type ClientStatus = 'active' | 'prospect' | 'paused' | 'past' | 'irrelevant';
export type LeadSource = 'outbound' | 'referral' | 'website' | 'conference' | 'partner' | 'existing' | 'other';

export const CLIENT_DOMAINS: ClientDomain[] = ['tourism', 'academia', 'organization', 'other'];
export const CLIENT_STATUSES: ClientStatus[] = ['active', 'prospect', 'paused', 'past', 'irrelevant'];
export const LEAD_SOURCES: LeadSource[] = ['outbound', 'referral', 'website', 'conference', 'partner', 'existing', 'other'];

export interface IContact {
  _id: Types.ObjectId;
  name: string;
  role?: string;
  /** Mobile. `officePhone` is the desk line — people ask for both. */
  phone?: string;
  officePhone?: string;
  email?: string;
  isPrimary: boolean;
  notes?: string;
}

export interface IClient {
  _id: Types.ObjectId;
  name: string;
  domain: ClientDomain;
  status: ClientStatus;
  leadSource: LeadSource;
  website?: string;
  /**
   * What the first meeting taught us about the organisation. Open to every
   * employee on purpose: whoever walks into the next meeting needs it.
   */
  brief?: string;
  contacts: IContact[];
  ownerUserId?: Types.ObjectId;

  /**
   * The commercial agreement. Owner-only — stripped by serializeClient for
   * everyone else, exactly like a project's price.
   */
  contract?: {
    startDate?: Date;
    endDate?: Date;
    /** One-off build fee agreed in the contract. */
    initialFee?: number;
    /** Recurring monthly charge. */
    monthlyFee?: number;
    notes?: string;
  };

  lastContactDate?: Date;
  nextActionText?: string;
  nextActionDate?: Date;
  nextActionUserId?: Types.ObjectId;

  driveUrl?: string;
  tags: string[];
  notes?: string;
  archived: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>({
  name: { type: String, required: true, trim: true },
  role: { type: String, trim: true },
  phone: { type: String, trim: true },
  officePhone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  isPrimary: { type: Boolean, default: false },
  notes: { type: String },
});

const clientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, enum: CLIENT_DOMAINS, default: 'other' },
    status: { type: String, enum: CLIENT_STATUSES, default: 'prospect' },
    leadSource: { type: String, enum: LEAD_SOURCES, default: 'existing' },
    website: { type: String, trim: true },
    brief: { type: String },
    contacts: { type: [contactSchema], default: [] },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'ManageUser' },

    contract: {
      startDate: { type: Date },
      endDate: { type: Date },
      initialFee: { type: Number },
      monthlyFee: { type: Number },
      notes: { type: String },
    },

    // Maintained by the server on every Interaction write — never trust a client-sent value.
    lastContactDate: { type: Date },
    nextActionText: { type: String, trim: true },
    nextActionDate: { type: Date },
    nextActionUserId: { type: Schema.Types.ObjectId, ref: 'ManageUser' },

    driveUrl: { type: String, trim: true },
    tags: { type: [String], default: [] },
    notes: { type: String },
    // Business entities are archived, never hard-deleted — history has to survive.
    archived: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'ManageUser', required: true },
  },
  { timestamps: true },
);

clientSchema.index({ status: 1, name: 1 });
clientSchema.index({ ownerUserId: 1 });
clientSchema.index({ lastContactDate: 1 });

export const Client = model<IClient>('ManageClient', clientSchema, 'mng_clients');
