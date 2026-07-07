import { Schema, model, Types } from 'mongoose';
import { FOLDER_COLOR_HEXES, DEFAULT_FOLDER_COLOR } from './ActivityFolder';

/** Folders for organizing Games in the admin Games sub-tab. Parallel to ActivityFolder /
 *  StationFolder (same shape, separate collection). Shares the FOLDER_COLOR_HEXES palette. */
export interface IGameFolder {
  _id: Types.ObjectId;
  name: string;
  color: string;
  createdByEmail?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const gameFolderSchema = new Schema<IGameFolder>(
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

export const GameFolder = model<IGameFolder>('GameFolder', gameFolderSchema, 'game_folders');
