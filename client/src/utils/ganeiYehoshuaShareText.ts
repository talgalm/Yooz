export const SHARE_CHALLENGE_LINE1 = 'עמדתי באתגר המזוודה הסודית של גני יהושוע';

export const BADGE_SHARE_LINE2 = 'המשימה הושלמה. התג שלי ביד 🏆';
export const VIDEO_SHARE_LINE2 = 'ככה נראים רגעי השיא שלי בפעילות 🎬';

export function buildBadgeShareTextBody(): string {
  return `${SHARE_CHALLENGE_LINE1}\n${BADGE_SHARE_LINE2}`;
}

export function buildVideoShareTextBody(): string {
  return `${SHARE_CHALLENGE_LINE1}\n${VIDEO_SHARE_LINE2}`;
}

export function buildBadgeSharePlainText(activityUrl: string): string {
  return `${buildBadgeShareTextBody()}\n${activityUrl}`;
}

export function buildVideoSharePlainText(activityUrl?: string): string {
  const body = buildVideoShareTextBody();
  return activityUrl ? `${body}\n${activityUrl}` : body;
}

export function buildBadgeShareHtml(activityUrl: string): string {
  return `${SHARE_CHALLENGE_LINE1}<br>${BADGE_SHARE_LINE2}<br><a href="${activityUrl}">${activityUrl}</a>`;
}
