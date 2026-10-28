import { translate } from '../../../context/LanguageContext';
import type { Lang } from '../../../utils/languages';
import type { MarketingRoute } from './routes';
import { texts as homeTexts } from '../HomePage/HomePage.i18n';
import { texts as businessTexts } from '../BusinessPage/BusinessPage.i18n';
import { texts as tourismTexts } from '../TourismPage/TourismPage.i18n';
import { texts as academyTexts } from '../AcademyPage/AcademyPage.i18n';

export interface FaqItem {
  q: string;
  a: string;
}

const FAQ_BY_PAGE: Partial<Record<MarketingRoute['key'], (lang: Lang) => FaqItem[]>> = {
  home: (lang) => translate(homeTexts, lang).faq,
  business: (lang) => translate(businessTexts, lang).faq,
  tourism: (lang) => translate(tourismTexts, lang).faq,
  academy: (lang) => translate(academyTexts, lang).faq,
};

export function pageFaq(key: MarketingRoute['key'], lang: Lang): FaqItem[] {
  return FAQ_BY_PAGE[key]?.(lang) ?? [];
}
