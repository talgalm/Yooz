import { Schema, model, Types } from 'mongoose';

export interface IGame {
  _id: Types.ObjectId;
  name: string;
  type: string; // template type: 'trivia', 'gold', etc. (determined later)
  description?: string;
  customer?: string;
  theme?: string;
  tags?: string[];
  settings: Record<string, unknown>;
  createdAt: Date;
  createdByEmail?: string;
  /** Admin Games sub-tab folder this game is filed under (null = ungrouped). */
  folderId?: Types.ObjectId | null;
}

const gameSchema = new Schema<IGame>({
  name: { type: String, required: true },
  type: { type: String, required: true, default: 'generic' },
  description: { type: String },
  customer: { type: String },
  theme: { type: String },
  tags: { type: [String], default: [] },
  settings: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  createdByEmail: { type: String, lowercase: true, trim: true },
  folderId: { type: Schema.Types.ObjectId, ref: 'GameFolder', default: null, index: true },
});

gameSchema.index({ tags: 1 });
gameSchema.index({ name: 'text', description: 'text', 'settings.questions.text': 'text' });

export const Game = model<IGame>('Game', gameSchema, 'games');
