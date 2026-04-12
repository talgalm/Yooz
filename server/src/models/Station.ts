import { Schema, model, Types } from 'mongoose';

export type StationType = 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback' | 'riddle';

export interface IStation {
  _id: Types.ObjectId;
  name: string;
  type: StationType;
  description?: string;
  customer?: string;
  theme?: string;
  tags?: string[];
  settings: Record<string, unknown>;
  createdAt: Date;
  createdByEmail?: string;
}

const stationSchema = new Schema<IStation>({
  name: { type: String, required: true },
  type: { type: String, enum: ['text', 'video', 'image', 'narrative', 'badge', 'collage', 'feedback', 'riddle'], default: 'text' },
  description: { type: String },
  customer: { type: String },
  theme: { type: String },
  tags: { type: [String], default: [] },
  settings: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  createdByEmail: { type: String, lowercase: true, trim: true },
});

stationSchema.index({ tags: 1 });

export const Station = model<IStation>('Station', stationSchema, 'stations');
