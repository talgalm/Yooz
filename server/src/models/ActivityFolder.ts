import { Schema, model, Types } from 'mongoose';

/** Closed set of pastel folder colors. Keep in sync with the client palette in
 *  client/src/pages/admin/folderColors.ts (FOLDER_COLORS). Folder colors are a
 *  fixed set (unlike free-form theme colors), so we validate against it. */
export const FOLDER_COLOR_HEXES = [
  '#E7E3FA', // lavender (default)
  '#E3F2FD', // sky
  '#E4F5E9', // mint
  '#FBF3C4', // lemon
  '#FCE7D6', // peach
  '#FCE0E4', // rose
  '#D7F2EE', // aqua
  '#E7E9EF', // slate
] as const;

export const DEFAULT_FOLDER_COLOR = FOLDER_COLOR_HEXES[0];

export interface IActivityFolder {
  _id: Types.ObjectId;
  name: string;
  color: string; // hex, one of FOLDER_COLOR_HEXES
  /** Scopes the folder to its creator, mirroring Activity.createdByEmail. */
  createdByEmail?: string;
  /** Reserved for future manual folder ordering; currently sorted by name. */
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
