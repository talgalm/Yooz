import { Schema, model } from 'mongoose';

export type CollageJobPhase =
  | 'collecting'
  | 'queued'
  | 'preparing'
  | 'encoding'
  | 'uploading'
  | 'done'
  | 'error';

export interface ICollageJob {
  jobId: string;
  activityCode: string;
  splitGroupId?: string;
  template: string;
  logoUrl?: string;
  title?: string;
  titleImageUrl?: string;
  requiredImages: number;
  /** Cloudinary URLs in panel order (index 0..requiredImages-1). */
  imageUrls: string[];
  phase: CollageJobPhase;
  percent: number;
  message: string;
  error?: string;
  resultUrl?: string;
  isVideo: boolean;
  /** When set, server SMS's resultUrl to this number once phase === 'done'. */
  smsPhone?: string;
  smsSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const collageJobSchema = new Schema<ICollageJob>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    activityCode: { type: String, required: true, index: true },
    splitGroupId: { type: String, index: true },
    template: { type: String, required: true, default: 'default' },
    logoUrl: { type: String },
    title: { type: String },
    titleImageUrl: { type: String },
    requiredImages: { type: Number, required: true },
    imageUrls: { type: [String], default: [] },
    phase: {
      type: String,
      enum: ['collecting', 'queued', 'preparing', 'encoding', 'uploading', 'done', 'error'],
      default: 'collecting',
    },
    percent: { type: Number, default: 0 },
    message: { type: String, default: '' },
    error: { type: String },
    resultUrl: { type: String },
    isVideo: { type: Boolean, default: true },
    smsPhone: { type: String },
    smsSentAt: { type: Date },
  },
  { timestamps: true },
);

collageJobSchema.index({ activityCode: 1, splitGroupId: 1 });

export const CollageJob = model<ICollageJob>('CollageJob', collageJobSchema);
