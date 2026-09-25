import { Schema, model, Types } from 'mongoose';

export interface ICustomTheme {
  _id: Types.ObjectId;
  name: string;
  mainColor: string;
  roadmapImage?: string;
  stationsImage?: string;
  textColor?: string;
  bgColor?: string;
  roadmapActiveNodeColor?: string;
  roadmapPathColor?: string;
  headerIconColor?: string;
  createdByEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customThemeSchema = new Schema<ICustomTheme>(
  {
    name: { type: String, required: true, trim: true },
    mainColor: { type: String, required: true },
    roadmapImage: { type: String },
    stationsImage: { type: String },
    textColor: { type: String },
    bgColor: { type: String },
    roadmapActiveNodeColor: { type: String },
    roadmapPathColor: { type: String },
    headerIconColor: { type: String },
    createdByEmail: { type: String },
  },
  { timestamps: true },
);

export const CustomTheme = model<ICustomTheme>('CustomTheme', customThemeSchema, 'custom_themes');
