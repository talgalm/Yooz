import { Schema, model, Types } from 'mongoose';

export interface ILibraryItem {
  _id: Types.ObjectId;
  kind: 'game' | 'station';
  name: string;
  type: string;
  description?: string;
  customer?: string;
  lang?: string;
  tags: string[];
  settings: Record<string, unknown>;
  createdAt: Date;
  createdByEmail?: string;
}

const libraryItemSchema = new Schema<ILibraryItem>({
  kind: { type: String, enum: ['game', 'station'], required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String },
  customer: { type: String },
  lang: { type: String },
  tags: { type: [String], default: [] },
  settings: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  createdByEmail: { type: String, lowercase: true, trim: true },
});

libraryItemSchema.index({ tags: 1 });
libraryItemSchema.index({ kind: 1, type: 1 });
libraryItemSchema.index({ name: 'text', description: 'text', customer: 'text' });

export const LibraryItem = model<ILibraryItem>('LibraryItem', libraryItemSchema, 'library_items');
