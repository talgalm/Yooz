import { Schema, model, Types } from 'mongoose';

export interface ICustomTheme {
  _id: Types.ObjectId;
  name: string;
  mainColor: string;       // hex, e.g. '#e67e22'
  roadmapImage?: string;   // Cloudinary URL used as roadmap bg
  stationsImage?: string;  // Cloudinary URL used behind station screens
  textColor?: string;      // hex — station title text color
  bgColor?: string;        // hex — browser theme-color (meta tag) for roadmap + stations
  roadmapActiveNodeColor?: string; // hex — optional active roadmap node color
  roadmapPathColor?: string; // hex — optional roadmap path color
  headerIconColor?: string; // hex — optional session header icon color
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
  },
  { timestamps: true },
);

export const CustomTheme = model<ICustomTheme>('CustomTheme', customThemeSchema, 'custom_themes');
