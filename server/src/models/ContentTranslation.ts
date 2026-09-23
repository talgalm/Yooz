import mongoose, { Schema, Document } from 'mongoose';

/**
 * One cached machine translation of one piece of admin-authored content.
 *
 * Activity content - station titles, riddles, trivia questions, popup text - is
 * written in Hebrew in the admin and translated on demand for a participant
 * running the activity in another language. A translation is pure function of
 * (source text, target language), so it is cached by a hash of exactly that:
 * the same riddle costs one call however many people walk the route, and a game
 * never waits on the model twice for the same sentence.
 *
 * Editing the text in the admin changes its hash, so the next run translates
 * the new wording instead of serving the old one - nothing to invalidate.
 */
export interface IContentTranslation extends Document {
  /** sha256 of `${lang}:${source}` - the whole identity of the row. */
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
