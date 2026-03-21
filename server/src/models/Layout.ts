import { Schema, model } from 'mongoose';

export interface ILayout {
  key: string;
  label: { en: string; he: string };
  settings: Record<string, unknown>;
  createdAt: Date;
}

const layoutSchema = new Schema<ILayout>({
  key: { type: String, required: true, unique: true },
  label: {
    en: { type: String, required: true },
    he: { type: String, required: true },
  },
  settings: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

export const Layout = model<ILayout>('Layout', layoutSchema, 'layouts');
