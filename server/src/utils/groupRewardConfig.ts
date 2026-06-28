import crypto from 'crypto';
import { GroupRewardConfig } from '../types';
import { IActivity } from '../models/Activity';

export function buildRewardDownloadUrl(downloadToken: string): string {
  const base = process.env.SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  return `${base}/api/reward-download/${downloadToken}`;
}

export function cloudinaryAttachmentUrl(url: string): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  if (url.includes('/upload/fl_attachment')) return url;
  return url.replace('/upload/', '/upload/fl_attachment/');
}

export function renderWinnerSms(
  template: string,
  vars: { name: string; score: number; coupon: string; group: string; link: string },
): string {
  let result = template
    .replace(/\{name\}/g, vars.name)
    .replace(/\{score\}/g, String(vars.score))
    .replace(/\{coupon\}/g, vars.coupon)
    .replace(/\{group\}/g, vars.group)
    .replace(/\{link\}/g, vars.link);
  if (vars.link && !template.includes('{link}')) result = `${result}\n${vars.link}`;
  return result;
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
