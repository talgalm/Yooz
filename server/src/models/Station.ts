import { Schema, model, Types } from 'mongoose';

export type StationType = 'text' | 'video' | 'image' | 'narrative' | 'badge';

export interface IStation {
  _id: Types.ObjectId;
  name: string;
  type: StationType;
  description?: string;
  customer?: string;
  theme?: string;
  settings: Record<string, unknown>;
  createdAt: Date;
}

const stationSchema = new Schema<IStation>({
  name: { type: String, required: true },
  type: { type: String, enum: ['text', 'video', 'image', 'narrative', 'badge'], default: 'text' },
  description: { type: String },
  customer: { type: String },
  theme: { type: String },
  settings: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

export const Station = model<IStation>('Station', stationSchema, 'stations');
