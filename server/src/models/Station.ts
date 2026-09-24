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
  /**
   * Human-reviewed translations, by language and then by the exact Hebrew it
   * replaces: { en: { 'אבטחת מידע': 'Information Security' } }.
   *
   * Keyed by the source text, not by field path, because settings are free-form
   * per type - one correction fixes that sentence wherever it appears in this
   * document. Edit the Hebrew and the key stops matching, so the correction
   * retires with the wording it was written for and the machine takes over
   * again, which is the rule the translation cache already follows.
   */
  translations?: Record<string, Record<string, string>>;
  createdAt: Date;
  createdByEmail?: string;
  /** Admin Stations-tab folder this station is filed under (null = ungrouped). */
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
  /** Human-reviewed translations; see the interface for the shape. */
  translations: { type: Schema.Types.Mixed, default: undefined },
  createdAt: { type: Date, default: Date.now },
  createdByEmail: { type: String, lowercase: true, trim: true },
  folderId: { type: Schema.Types.ObjectId, ref: 'StationFolder', default: null, index: true },
});

stationSchema.index({ tags: 1 });

export const Station = model<IStation>('Station', stationSchema, 'stations');
