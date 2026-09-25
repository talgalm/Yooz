import { Schema, model, Types } from 'mongoose';
import { FOLDER_COLOR_HEXES, DEFAULT_FOLDER_COLOR } from './ActivityFolder';

export interface IStationFolder {
  _id: Types.ObjectId;
  name: string;
  color: string;
  createdByEmail?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const stationFolderSchema = new Schema<IStationFolder>(
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

export const StationFolder = model<IStationFolder>(
  'StationFolder',
  stationFolderSchema,
  'station_folders',
);
