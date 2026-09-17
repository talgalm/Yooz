/**
 * Design tokens for the public marketing site (Home / Business / Academy / Tourism).
 *
 * Every value here was sampled directly out of the exported Figma frames in
 * `temp-imgs/אתר yooz/` rather than estimated, so treat them as the source of
 * truth and change them only against a fresh sample.
 *
 * Deliberately separate from `components/styled.ts`: that file is the app + admin
 * language (flat cards, `#6c5ce7`), while the marketing site is violet, rounded,
 * blob-heavy and gradient-driven. Keeping them apart means restyling the site can
 * never regress a participant screen.
 */

export const C = {
  // ─── Page grounds ───
  /** Nav bar and hero ground. The site's signature pale pink-lavender. */
  shell: '#FFE8FF',
  /** Near-white used by the "why choose" and FAQ sections. */
  paper: '#FFFAFF',
  paperSoft: '#FFF8FF',
  /** Footer band. */
  footer: '#F8F2FD',

  // ─── Sector bands (full-bleed, curved boundaries) ───
  bandPeach: '#FFD9DA',
  bandLavender: '#D2CCEE',
  bandMint: '#DFF3CD',
  /** Customer-logo band. */
  bandPink: '#FFE7FD',

  // ─── Hero blobs ───
  blobCream: '#FFF4D9',
  blobPurple: '#E8CBFF',

  // ─── Venn blobs (semi-transparent, multiply-blended) ───
  vennEngage: '#E8D8FF',
  vennEngageEdge: '#C0A8D8',
  vennGrow: '#C0C8FF',
  vennGrowEdge: '#8088C0',
  vennShare: '#FFE8E8',
  vennShareEdge: '#F0D0E0',

  // ─── Brand violet ───
  /** Wordmark. */
  logo: '#721BA0',
  /** Solid nav CTA and the contact form's submit. */
  purple: '#6A0E9A',
  purpleDeep: '#7018A0',
  /** Headings. Near-black violet, not a mid purple. */
  heading: '#380850',
  /** Input borders. */
  border: '#9048B0',

  // ─── Accents ───
  magenta: '#E9479A',
  /** FAQ toggle discs. */
  amber: '#FFC050',
  /** Testimonial stars. */
  gold: '#F8C020',
  /** Numbered list discs on the peach band. */
  discPink: '#F8C8C8',
  /** Numbered list discs on the mint band. */
  discMint: '#B8E888',
  discNumber: '#682890',

  // ─── Ink ───
  ink: '#463A52',
  inkSoft: '#6B6480',
  white: '#FFFFFF',

  // ─── Lines ───
  /** FAQ row separators - warm, not grey, and inset rather than full-bleed. */
  ruleWarm: '#FFECD9',
  ruleSoft: '#F3E8F6',
} as const;

/**
 * The primary CTA sweep, sampled across the hero button left-to-right:
 * #5C1B8B → #681EA2 → #8223CC → #A730BA → #CB3DA9 → #E9479A
 */
export const CTA_GRADIENT =
  'linear-gradient(to right, #5C1B8B 0%, #7A21BC 32%, #A730BA 62%, #CB3DA9 82%, #E9479A 100%)';

/**
 * The hero does not end on an edge. Scanning a clean column downward gives
 * FFE8FF (y540) → FFECFF (580) → FFF1FF (620) → FFF5FF (660) → FFFAFF (720):
 * it dissolves into the section below over roughly 180px.
 */
export const HERO_FADE =
  'linear-gradient(to bottom, #FFE8FF 0%, #FFE8FF 58%, #FFEDFF 74%, #FFF3FF 86%, #FFFAFF 100%)';

/**
 * The band carrying "מנוע אחד - שלושה מגזרים" is a vertical gradient, uniform at
 * every x: FFF8FF → FFF5FF → FFF3FF → FFF0FF → FFEDFF → FFEBFF → FFE7FF.
 */
export const SECTORS_GRADIENT =
  'linear-gradient(to bottom, #FFF8FF 0%, #FFF3FF 34%, #FFEDFF 66%, #FFE7FF 100%)';

/** The hero's second headline line carries the same sweep as ink. */
export const TEXT_GRADIENT = 'linear-gradient(to right, #7727BA 0%, #B038D0 45%, #E9479A 100%)';

export const SHADOW = {
  card: '0 4px 20px rgba(56,8,80,0.08)',
  cardHover: '0 10px 32px rgba(56,8,80,0.14)',
  float: '0 18px 48px rgba(56,8,80,0.16)',
  button: '0 6px 18px rgba(106,14,154,0.28)',
  quote: '0 10px 30px rgba(56,8,80,0.12)',
} as const;

export const RADIUS = {
  /** The comps use a soft rectangle, not a pill, for buttons and fields. */
  button: 10,
  field: 10,
  card: 16,
  cardLarge: 24,
  /** Photos and the contact card. */
  frame: 28,
  pill: 999,
} as const;

/**
 * Outer content width. In the 1512-wide frame the content runs x102..1410, so
 * the column is 1308px; centred with a 24px gutter that is `1308 + 48 = 1356`.
 */
export const CONTAINER = 1356;
/** The design frame width every sampled coordinate is relative to. */
export const FRAME_WIDTH = 1512;

export const BP = {
  mobile: '@media (max-width: 700px)',
  tablet: '@media (max-width: 960px)',
  desktop: '@media (min-width: 961px)',
} as const;

/** Respect the global reduced-motion rule in App.css for anything animated. */
export const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';
