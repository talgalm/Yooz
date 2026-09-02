import { Schema, model, Types } from 'mongoose';

export type InteractionType = 'call' | 'meeting' | 'email' | 'whatsapp' | 'demo' | 'other';

export const INTERACTION_TYPES: InteractionType[] = ['call', 'meeting', 'email', 'whatsapp', 'demo', 'other'];

export interface IInteraction {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;
  projectId?: Types.ObjectId;
  contactId?: Types.ObjectId;
  type: InteractionType;
  date: Date;
  summary: string;
  userId: Types.ObjectId;

  nextActionText?: string;
  nextActionDate?: Date;
  nextActionUserId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const interactionSchema = new Schema<IInteraction>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'ManageClient', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'ManageProject' },
    contactId: { type: Schema.Types.ObjectId },
    type: { type: String, enum: INTERACTION_TYPES, required: true },
    date: { type: Date, required: true },
    summary: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'ManageUser', required: true },

    nextActionText: { type: String, trim: true },
    nextActionDate: { type: Date },
    nextActionUserId: { type: Schema.Types.ObjectId, ref: 'ManageUser' },
  },
  { timestamps: true },
);

interactionSchema.index({ clientId: 1, date: -1 });
interactionSchema.index({ projectId: 1, date: -1 });
interactionSchema.index({ nextActionDate: 1 });

export const Interaction = model<IInteraction>('ManageInteraction', interactionSchema, 'mng_interactions');
