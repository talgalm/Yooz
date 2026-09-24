/**
 * The marketing site's own navigation map.
 *
 * One source of truth so the header and the footer's "תחומים" column can never
 * drift apart. Array order is display order: under RTL the first entry is the
 * rightmost nav item. The comps had no "home" item (the wordmark was the only
 * way back to `/`); "ראשי" was added on request.
 *
 * A `path` beginning with `#` is an in-page anchor and renders as a plain link
 * rather than a route.
 */

type SectorKey = 'business' | 'tourism' | 'academy';

export interface MarketingRoute {
  /** Stable key, also the i18n key for the link label. */
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

/** The footer's "תחומים" column lists only the three real sector pages. */
export const SECTOR_ROUTES = MARKETING_ROUTES.filter(
  (r): r is MarketingRoute & { key: SectorKey } => r.key !== 'home' && r.key !== 'about',
);

/** Anchor used by every "book a demo" button on every page. */
export const CONTACT_ANCHOR = '#contact';
