import { LANGS, type Lang } from '../../../utils/languages';
import { localizedPath } from '../../../utils/currentLang';

type SectorKey = 'business' | 'tourism' | 'academy';

export interface MarketingRoute {
  key: 'home' | SectorKey | 'about';
  path: string;
}

export const MARKETING_ROUTES: MarketingRoute[] = [
  { key: 'home', path: '/' },
  { key: 'business', path: '/business' },
  { key: 'tourism', path: '/tourism' },
  { key: 'academy', path: '/academy' },
  { key: 'about', path: '/about' },
];

export interface LocalizedMarketingRoute extends MarketingRoute {
  lang: Lang;
  localPath: string;
}

export const LOCALIZED_MARKETING_ROUTES: LocalizedMarketingRoute[] = LANGS.flatMap(({ code }) =>
  MARKETING_ROUTES.map((route) => ({ ...route, lang: code, localPath: localizedPath(route.path, code) })),
);

export const SECTOR_ROUTES = MARKETING_ROUTES.filter(
  (r): r is MarketingRoute & { key: SectorKey } => r.key !== 'home' && r.key !== 'about',
);

export const CONTACT_ANCHOR = '#contact';
