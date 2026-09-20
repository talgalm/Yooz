/**
 * The marketing site's own navigation map.
 *
 * One source of truth so the header and the footer's "תחומים" column can never
 * drift apart. The comps carry no "home" nav item - the wordmark is the link
 * back to `/`.
 *
 * A `path` beginning with `#` is an in-page anchor and renders as a plain link
 * rather than a route.
 */

export interface MarketingRoute {
  /** Stable key, also the i18n key for the link label. */
  key: 'business' | 'academy' | 'tourism' | 'about';
  path: string;
}

export const MARKETING_ROUTES: MarketingRoute[] = [
  { key: 'business', path: '/business' },
  { key: 'academy', path: '/academy' },
  { key: 'tourism', path: '/tourism' },
  { key: 'about', path: '/about' },
];

/** The footer's "תחומים" column lists only the three real sector pages. */
export const SECTOR_ROUTES = MARKETING_ROUTES.filter(
  (r): r is MarketingRoute & { key: 'business' | 'academy' | 'tourism' } => r.key !== 'about',
);

/** Anchor used by every "book a demo" button on every page. */
export const CONTACT_ANCHOR = '#contact';
