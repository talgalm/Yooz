import crypto from 'crypto';
import { GroupRewardConfig } from '../types';
import { IActivity } from '../models/Activity';

export function buildRewardDownloadUrl(downloadToken: string): string {
  const base = process.env.SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  return `${base}/api/reward-download/${downloadToken}`;
}

export function resolveGroupRewardForSave(
  groupReward: GroupRewardConfig | undefined,
  existing?: IActivity['groupReward'],
): IActivity['groupReward'] | undefined {
  if (!groupReward?.enabled || !groupReward.couponCode?.trim()) {
    return { enabled: false, couponCode: '' };
  }

  const attachmentUrl = groupReward.attachmentUrl?.trim();
  const result: NonNullable<IActivity['groupReward']> = {
    enabled: true,
    couponCode: groupReward.couponCode.trim(),
    ...(groupReward.messageTemplate?.trim() && { messageTemplate: groupReward.messageTemplate.trim() }),
  };

  if (attachmentUrl) {
    result.attachmentUrl = attachmentUrl;
    result.attachmentType = groupReward.attachmentType === 'pdf' ? 'pdf' : 'image';
    result.downloadToken =
      existing?.attachmentUrl === attachmentUrl && existing.downloadToken
        ? existing.downloadToken
        : crypto.randomBytes(16).toString('base64url');
  }

  return result;
}
