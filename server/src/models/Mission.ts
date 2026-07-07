import { Schema, model, Types } from 'mongoose';

export interface IMissionScreen {
  header?: string;
  description?: string;
  buttonText?: string;
  image?: string;
  backgroundImage?: string;
}

export interface IPuzzleConfig {
  completeHeader?: string;
  completeButton?: string;
}

export interface ITrashSortConfig {
  title?: string;
  description?: string;
  scoreLabel?: string;
  gameFinalText?: string;
  completeHeader?: string;
  completeButton?: string;
  badgeHeader?: string;
  badgeCurveText?: string;
  badgeAwardText?: string;
  badgeAchievementText?: string;
  shareButton?: string;
  continueButton?: string;
}

export interface IMission {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  customer?: string;
  // Part 1: explanation screens
  explanationScreens: IMissionScreen[];
  // Part 2: puzzle
  puzzleConfig?: IPuzzleConfig;
  // Part 3: trash sort
  trashSortConfig?: ITrashSortConfig;
  createdAt: Date;
  createdByEmail?: string;
  /** Admin Missions sub-tab folder this mission is filed under (null = ungrouped). */
  folderId?: Types.ObjectId | null;
}

const missionScreenSchema = new Schema<IMissionScreen>({
  header: { type: String },
  description: { type: String },
  buttonText: { type: String },
  image: { type: String },
  backgroundImage: { type: String },
}, { _id: false });

const puzzleConfigSchema = new Schema<IPuzzleConfig>({
  completeHeader: { type: String },
  completeButton: { type: String },
}, { _id: false });

const trashSortConfigSchema = new Schema<ITrashSortConfig>({
  title: { type: String },
  description: { type: String },
  scoreLabel: { type: String },
  gameFinalText: { type: String },
  completeHeader: { type: String },
  completeButton: { type: String },
  badgeHeader: { type: String },
  badgeCurveText: { type: String },
  badgeAwardText: { type: String },
  badgeAchievementText: { type: String },
  shareButton: { type: String },
  continueButton: { type: String },
}, { _id: false });

const missionSchema = new Schema<IMission>({
  name: { type: String, required: true },
  description: { type: String },
  customer: { type: String },
  explanationScreens: { type: [missionScreenSchema], default: [] },
  puzzleConfig: { type: puzzleConfigSchema },
  trashSortConfig: { type: trashSortConfigSchema },
  createdAt: { type: Date, default: Date.now },
  createdByEmail: { type: String, lowercase: true, trim: true },
  folderId: { type: Schema.Types.ObjectId, ref: 'MissionFolder', default: null, index: true },
});

export const Mission = model<IMission>('Mission', missionSchema, 'missions');
