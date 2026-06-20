import { Schema, model, Types } from 'mongoose';

export type SmsNotificationStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface ISmsNotification {
  activityId: Types.ObjectId;
  activityCode: string;
  groupName: string;
  activityGroupId?: Types.ObjectId;
  reportId: Types.ObjectId;
  recipientName: string;
  phoneNumber: string;
  message: string;
  couponCode: string;
  status: SmsNotificationStatus;
  provider: string;
  providerMessageId?: string;
  error?: string;
  createdAt: Date;
  sentAt?: Date;
}

const smsNotificationSchema = new Schema<ISmsNotification>({
  activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true, index: true },
  activityCode: { type: String, required: true, index: true },
  groupName: { type: String, required: true, index: true },
  activityGroupId: { type: Schema.Types.ObjectId, ref: 'ActivityGroup' },
  reportId: { type: Schema.Types.ObjectId, ref: 'Report', required: true },
  recipientName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  message: { type: String, required: true },
  couponCode: { type: String, required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
  provider: { type: String, required: true },
  providerMessageId: { type: String },
  error: { type: String },
  createdAt: { type: Date, default: Date.now },
  sentAt: { type: Date },
});

smsNotificationSchema.index({ activityId: 1, groupName: 1 });

export const SmsNotification = model<ISmsNotification>('SmsNotification', smsNotificationSchema, 'sms_notifications');
