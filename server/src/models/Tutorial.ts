import { Schema, model, Types } from 'mongoose';

export interface ITutorialStep {
  name: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  detail?: string;
}

export interface ITutorial {
  _id: Types.ObjectId;
  title: string;
  description: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  videoUrl?: string;
  publicId?: string;
  thumbnailUrl?: string;
  error?: string;
  steps: ITutorialStep[];
  startedAt?: Date;
  createdAt: Date;
  createdBy: string;
}

const stepSchema = new Schema<ITutorialStep>({
  name: { type: String, required: true },
  status: { type: String, enum: ['pending', 'running', 'done', 'failed'], default: 'pending' },
  startedAt: { type: Date },
  completedAt: { type: Date },
  detail: { type: String },
}, { _id: false });

const tutorialSchema = new Schema<ITutorial>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['pending', 'generating', 'ready', 'failed'], default: 'pending' },
  videoUrl: { type: String },
  publicId: { type: String },
  thumbnailUrl: { type: String },
  error: { type: String },
  steps: { type: [stepSchema], default: [] },
  startedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
});

export const Tutorial = model<ITutorial>('Tutorial', tutorialSchema, 'tutorials');
