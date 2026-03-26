import { Schema, model, Types } from 'mongoose';

export interface ILibraryItem {
  _id: Types.ObjectId;
  kind: 'game' | 'station';       // what it would become if copied
  name: string;
  type: string;                     // game type (trivia, order...) or station type (text, video, image...)
  description?: string;
  customer?: string;                // original customer name
  lang?: string;                // he / en
  tags: string[];
  settings: Record<string, unknown>;
  createdAt: Date;
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
});

libraryItemSchema.index({ tags: 1 });
libraryItemSchema.index({ kind: 1, type: 1 });
libraryItemSchema.index({ name: 'text', description: 'text', customer: 'text' });

export const LibraryItem = model<ILibraryItem>('LibraryItem', libraryItemSchema, 'library_items');
