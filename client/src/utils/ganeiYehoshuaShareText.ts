import { translate, type Lang } from '../context/LanguageContext';
import { texts } from './ganeiYehoshuaShareText.i18n';

export const shareLines = (lang: Lang) => translate(texts, lang);

export function buildBadgeShareTextBody(lang: Lang): string {
  const t = shareLines(lang);
  return `${t.challenge}\n${t.badge}`;
}

export function buildVideoShareTextBody(lang: Lang): string {
  const t = shareLines(lang);
  return `${t.challenge}\n${t.video}`;
}

export function buildBadgeSharePlainText(lang: Lang, activityUrl: string): string {
  return `${buildBadgeShareTextBody(lang)}\n${activityUrl}`;
}

export function buildVideoSharePlainText(lang: Lang, activityUrl?: string): string {
  const body = buildVideoShareTextBody(lang);
  return activityUrl ? `${body}\n${activityUrl}` : body;
}

export function buildBadgeShareHtml(lang: Lang, activityUrl: string): string {
  const t = shareLines(lang);
  return `${t.challenge}<br>${t.badge}<br><a href="${activityUrl}">${activityUrl}</a>`;
}
