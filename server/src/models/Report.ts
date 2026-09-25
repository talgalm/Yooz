import { Schema, model, Types } from 'mongoose';

export interface IQuestionAnswer {
  questionIndex: number;
  questionText?: string;
  selectedAnswers: number[];
  correctAnswers: number[];
  isCorrect: boolean;
  pointsEarned: number;
  timeSpentMs: number;
}

export interface IItemResult {
  itemIndex: number;
  itemId: string;
  itemType: 'game' | 'station';
  itemName: string;
  gameType?: string;
  score: number;
  maxPossibleScore?: number;
  startedAt: Date;
  completedAt?: Date;
  durationMs: number;
  hintUsed: boolean;
  hintPenalty: number;
  questionAnswers?: IQuestionAnswer[];
  attempts?: number;
  metadata?: Record<string, unknown>;
}

export interface IReportData {
  scores?: { gameName: string; score: number }[];
  totalScore: number;
  itemResults?: IItemResult[];
}

export type CompletionStatus = 'joined' | 'in_progress' | 'completed';

export interface IReport {
  _id?: Types.ObjectId;
  activityId: Types.ObjectId;
  activityCode: string;
  participantName: string;
  email?: string;
  phoneNumber?: string;
  lang?: string;
  connectionType: string;
  group?: string;
  joinedAt: Date;
  data: IReportData;
  completionStatus: CompletionStatus;
  sessionStartedAt?: Date;
  sessionCompletedAt?: Date;
  sessionDurationMs?: number;
  totalItemsCompleted: number;
  totalItemsInModule?: number;
  lastActiveItemIndex: number;
}

const reportSchema = new Schema<IReport>({
  activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true },
  activityCode: { type: String, required: true },
  participantName: { type: String, required: true },
  email: { type: String },
  phoneNumber: { type: String },
  lang: { type: String },
  connectionType: { type: String, required: true },
  group: { type: String },
  joinedAt: { type: Date, default: Date.now },
  data: { type: Schema.Types.Mixed, default: {} },
  completionStatus: {
    type: String,
    enum: ['joined', 'in_progress', 'completed'],
    default: 'joined',
  },
  sessionStartedAt: { type: Date },
  sessionCompletedAt: { type: Date },
  sessionDurationMs: { type: Number },
  totalItemsCompleted: { type: Number, default: 0 },
  totalItemsInModule: { type: Number },
  lastActiveItemIndex: { type: Number, default: 0 },
});

reportSchema.index({ activityId: 1 });
reportSchema.index({ activityCode: 1 });
reportSchema.index({ activityCode: 1, joinedAt: -1 });
reportSchema.index({ activityCode: 1, participantName: 1, joinedAt: -1 });
reportSchema.index({ activityCode: 1, email: 1, joinedAt: -1 }, { sparse: true });
reportSchema.index({ activityCode: 1, phoneNumber: 1, joinedAt: -1 }, { sparse: true });
reportSchema.index({ activityId: 1, completionStatus: 1 });
reportSchema.index({ activityId: 1, group: 1 });
reportSchema.index({ activityId: 1, joinedAt: -1 });
reportSchema.index({ activityId: 1, 'data.totalScore': -1 });
reportSchema.index({ activityId: 1, completionStatus: 1, sessionDurationMs: 1 });

export const Report = model<IReport>('Report', reportSchema, 'reports');
