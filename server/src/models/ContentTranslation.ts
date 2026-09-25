import mongoose, { Schema, Document } from 'mongoose';

export interface IContentTranslation extends Document {
  key: string;
  lang: string;
  source: string;
  translated: string;
  createdAt: Date;
}

const contentTranslationSchema = new Schema<IContentTranslation>({
  key: { type: String, required: true, unique: true, index: true },
  lang: { type: String, required: true },
  source: { type: String, required: true },
  translated: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const ContentTranslation = mongoose.model<IContentTranslation>(
  'ContentTranslation',
  contentTranslationSchema,
);
