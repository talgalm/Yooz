
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

export const SECTOR_ROUTES = MARKETING_ROUTES.filter(
  (r): r is MarketingRoute & { key: SectorKey } => r.key !== 'home' && r.key !== 'about',
);

export const CONTACT_ANCHOR = '#contact';
