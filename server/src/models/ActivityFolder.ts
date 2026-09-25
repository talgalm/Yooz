import { Schema, model, Types } from 'mongoose';

export const FOLDER_COLOR_HEXES = [
  '#E7E3FA',
  '#E3F2FD',
  '#E4F5E9',
  '#FBF3C4',
  '#FCE7D6',
  '#FCE0E4',
  '#D7F2EE',
  '#E7E9EF',
] as const;

export const DEFAULT_FOLDER_COLOR = FOLDER_COLOR_HEXES[0];

export interface IActivityFolder {
  _id: Types.ObjectId;
  name: string;
  color: string;
  parentId?: Types.ObjectId | null;
  createdByEmail?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const activityFolderSchema = new Schema<IActivityFolder>(
  {
    name: { type: String, required: true, trim: true },
    color: {
      type: String,
      required: true,
      enum: FOLDER_COLOR_HEXES as unknown as string[],
      default: DEFAULT_FOLDER_COLOR,
    },
    parentId: { type: Schema.Types.ObjectId, ref: 'ActivityFolder', default: null, index: true },
    createdByEmail: { type: String, lowercase: true, trim: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const ActivityFolder = model<IActivityFolder>(
  'ActivityFolder',
  activityFolderSchema,
  'activity_folders',
);
