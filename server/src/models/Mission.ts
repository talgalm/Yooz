import { Schema, model, Types } from 'mongoose';

export interface IMissionScreen {
  header?: string;
  description?: string;
  buttonText?: string;
  image?: string;
  backgroundImage?: string;
}

export interface IMission {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  customer?: string;
  // Part 1: explanation screens
  explanationScreens: IMissionScreen[];
  // Future parts will be added here (Part 2, 3, 4)
  createdAt: Date;
}

const missionScreenSchema = new Schema<IMissionScreen>({
  header: { type: String },
  description: { type: String },
  buttonText: { type: String },
  image: { type: String },
  backgroundImage: { type: String },
}, { _id: false });

const missionSchema = new Schema<IMission>({
  name: { type: String, required: true },
  description: { type: String },
  customer: { type: String },
  explanationScreens: { type: [missionScreenSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const Mission = model<IMission>('Mission', missionSchema, 'missions');
