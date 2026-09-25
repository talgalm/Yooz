import { Schema, model, Types } from 'mongoose';
import crypto from 'crypto';

export interface IActivityGroup {
  _id?: Types.ObjectId;
  activityId: Types.ObjectId;
  activityCode: string;
  name: string;
  nameNormalized: string;
  activityDay: string;
  inviteToken: string;
  createdAt: Date;
  createdByName?: string;
  rewardProcessedAt?: Date;
  winnerReportId?: Types.ObjectId;
  winnerCouponCode?: string;
  rewardTimerEndsAt?: Date | null;
  maxMembersOverride?: number;
}

function generateInviteToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}

export function normalizeGroupName(name: string): string {
  return name.trim().toLowerCase();
}

const activityGroupSchema = new Schema<IActivityGroup>({
  activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true, index: true },
  activityCode: { type: String, required: true, index: true },
  name: { type: String, required: true },
  nameNormalized: { type: String, required: true },
  activityDay: { type: String, required: true, index: true },
  inviteToken: { type: String, required: true, unique: true, default: generateInviteToken },
  createdAt: { type: Date, default: Date.now },
  createdByName: { type: String },
  rewardProcessedAt: { type: Date },
  winnerReportId: { type: Schema.Types.ObjectId, ref: 'Report' },
  winnerCouponCode: { type: String },
  rewardTimerEndsAt: { type: Date, default: null },
  maxMembersOverride: { type: Number, default: null },
});

activityGroupSchema.index({ activityId: 1, activityDay: 1, nameNormalized: 1 }, { unique: true });
activityGroupSchema.index({ rewardTimerEndsAt: 1, rewardProcessedAt: 1 }, { sparse: true });

export const ActivityGroup = model<IActivityGroup>('ActivityGroup', activityGroupSchema, 'activity_groups');
