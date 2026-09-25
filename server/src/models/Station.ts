import { Schema, model, Types } from 'mongoose';

export type StationType = 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback' | 'riddle' | 'avatar' | 'avatarQuiz' | 'enteringText';

export interface IStation {
  _id: Types.ObjectId;
  name: string;
  type: StationType;
  description?: string;
  customer?: string;
  theme?: string;
  tags?: string[];
  settings: Record<string, unknown>;
  translations?: Record<string, Record<string, string>>;
  createdAt: Date;
  createdByEmail?: string;
  folderId?: Types.ObjectId | null;
}

const stationSchema = new Schema<IStation>({
  name: { type: String, required: true },
  type: { type: String, enum: ['text', 'video', 'image', 'narrative', 'badge', 'collage', 'feedback', 'riddle', 'avatar', 'avatarQuiz', 'enteringText'], default: 'text' },
  description: { type: String },
  customer: { type: String },
  theme: { type: String },
  tags: { type: [String], default: [] },
  settings: { type: Schema.Types.Mixed, default: {} },
  translations: { type: Schema.Types.Mixed, default: undefined },
  createdAt: { type: Date, default: Date.now },
  createdByEmail: { type: String, lowercase: true, trim: true },
  folderId: { type: Schema.Types.ObjectId, ref: 'StationFolder', default: null, index: true },
});

stationSchema.index({ tags: 1 });

export const Station = model<IStation>('Station', stationSchema, 'stations');
